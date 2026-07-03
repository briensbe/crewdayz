import { Injectable, signal, OnDestroy } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Absence } from '../models/types';
import { RealtimeChannel } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class AbsenceService implements OnDestroy {
  private _absences = signal<Absence[]>([]);
  public absences = this._absences.asReadonly();

  private _loading = signal<boolean>(false);
  public loading = this._loading.asReadonly();

  private realtimeChannel: RealtimeChannel | null = null;
  private currentYear: number | null = null;

  constructor(private supabase: SupabaseService) {
    this.setupRealtimeSubscription();
  }

  /**
   * Set up the Supabase Realtime subscription for the 'cd_absences' table.
   * Listens to INSERT, UPDATE, and DELETE events in the 'crewdayz' schema.
   */
  private setupRealtimeSubscription() {
    this.realtimeChannel = this.supabase.client
      .channel('cd-absences-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'crewdayz',
          table: 'cd_absences',
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          console.log(`[AbsenceService] Realtime event received: ${eventType}`, payload);

          this._absences.update((currentAbsences) => {
            if (eventType === 'INSERT') {
              const record = newRecord as Absence;
              const recordYear = parseInt(record.date.split('-')[0], 10);
              
              // Only insert if it matches the currently active year (if set)
              if (this.currentYear !== null && recordYear !== this.currentYear) {
                return currentAbsences;
              }

              // Avoid duplicate additions
              const exists = currentAbsences.some(
                (abs) => abs.id === record.id || 
                         (abs.employee_id === record.employee_id && abs.date === record.date && abs.period === record.period)
              );
              if (exists) return currentAbsences;

              return [...currentAbsences, record];
            } 
            
            if (eventType === 'UPDATE') {
              const record = newRecord as Absence;
              const recordYear = parseInt(record.date.split('-')[0], 10);

              // If the updated year is no longer our current year, remove it
              if (this.currentYear !== null && recordYear !== this.currentYear) {
                return currentAbsences.filter((abs) => abs.id !== record.id);
              }

              const index = currentAbsences.findIndex((abs) => abs.id === record.id);
              if (index !== -1) {
                const updated = [...currentAbsences];
                updated[index] = record;
                return updated;
              } else {
                // If it wasn't present, check if we should add it
                return [...currentAbsences, record];
              }
            } 
            
            if (eventType === 'DELETE') {
              const idToDelete = (oldRecord as { id: string }).id;
              return currentAbsences.filter((abs) => abs.id !== idToDelete);
            }

            return currentAbsences;
          });
        }
      )
      .subscribe((status) => {
        console.log(`[AbsenceService] Realtime connection status: ${status}`);
      });
  }

  ngOnDestroy() {
    if (this.realtimeChannel) {
      this.supabase.client.removeChannel(this.realtimeChannel);
    }
  }

  /**
   * Fetch absences for a specific employee or all employees in a given year.
   * Uses paginated requests (PAGE_SIZE rows each) to bypass Supabase's default
   * 1000-row response limit.
   */
  async fetchAbsencesForYear(year: number): Promise<Absence[]> {
    this.currentYear = year;
    this._loading.set(true);
    const PAGE_SIZE = 1000;
    const allAbsences: Absence[] = [];

    try {
      const startOfYear = `${year}-01-01`;
      const endOfYear = `${year}-12-31`;

      let from = 0;
      let hasMore = true;

      do {
        const to = from + PAGE_SIZE - 1;
        const { data, error } = await this.supabase.client
          .from('cd_absences')
          .select('*')
          .gte('date', startOfYear)
          .lte('date', endOfYear)
          .range(from, to);

        if (error) throw error;

        const page = data || [];
        allAbsences.push(...page);

        // If we received fewer rows than PAGE_SIZE, we've reached the last page
        hasMore = page.length === PAGE_SIZE;
        from += PAGE_SIZE;
      } while (hasMore);

      console.log(`[AbsenceService] Fetched ${allAbsences.length} absences for ${year}`);
      this._absences.set(allAbsences);
      return allAbsences;
    } catch (err) {
      console.error('Error fetching absences:', err);
      throw err;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Upsert (insert or update) one or more absences
   */
  async upsertAbsences(absences: Absence[], yearToRefresh: number): Promise<Absence[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('cd_absences')
        .upsert(absences, { onConflict: 'employee_id,date,period' })
        .select();

      if (error) throw error;
      await this.fetchAbsencesForYear(yearToRefresh);
      return data || [];
    } catch (err) {
      console.error('Error upserting absences:', err);
      throw err;
    }
  }

  /**
   * Replace absences for an employee on a set of dates
   */
  async replaceEmployeeAbsences(
    employeeId: string,
    datesToDelete: string[],
    newAbsences: Absence[],
    yearToRefresh: number,
  ): Promise<Absence[]> {
    try {
      if (datesToDelete.length > 0) {
        const { error: deleteError } = await this.supabase.client
          .from('cd_absences')
          .delete()
          .eq('employee_id', employeeId)
          .in('date', datesToDelete);

        if (deleteError) throw deleteError;
      }

      let data: Absence[] = [];
      if (newAbsences.length > 0) {
        const { data: upsertData, error: upsertError } = await this.supabase.client
          .from('cd_absences')
          .upsert(newAbsences, { onConflict: 'employee_id,date,period' })
          .select();

        if (upsertError) throw upsertError;
        data = upsertData || [];
      }

      await this.fetchAbsencesForYear(yearToRefresh);
      return data;
    } catch (err) {
      console.error('Error replacing employee absences:', err);
      throw err;
    }
  }

  /**
   * Delete specific absence records
   */
  async deleteAbsences(ids: string[], yearToRefresh: number): Promise<void> {
    if (ids.length === 0) return;
    try {
      const { error } = await this.supabase.client.from('cd_absences').delete().in('id', ids);

      if (error) throw error;
      await this.fetchAbsencesForYear(yearToRefresh);
    } catch (err) {
      console.error('Error deleting absences:', err);
      throw err;
    }
  }

  /**
   * Delete absences for a specific employee and specific dates/periods
   */
  async deleteEmployeeAbsencesForDates(
    employeeId: string,
    datePeriods: { date: string; period: 'full' | 'morning' | 'afternoon' }[],
    yearToRefresh: number,
  ): Promise<void> {
    if (datePeriods.length === 0) return;
    try {
      // Supabase OR condition or standard deletes
      // For simplicity and safety, we can delete them in a single query by generating the combinations
      // or querying the IDs first and deleting by ID.
      // Let's query matching records first
      const orConditions = datePeriods.map((dp) => `and(date.eq.${dp.date},period.eq.${dp.period})`).join(',');

      const { data, error: selectError } = await this.supabase.client
        .from('cd_absences')
        .select('id')
        .eq('employee_id', employeeId)
        .or(orConditions);

      if (selectError) throw selectError;

      if (data && data.length > 0) {
        const ids = data.map((item) => item.id);
        await this.deleteAbsences(ids, yearToRefresh);
      }
    } catch (err) {
      console.error('Error deleting employee absences for dates:', err);
      throw err;
    }
  }
}
