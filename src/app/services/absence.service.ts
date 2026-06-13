import { Injectable, signal } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import { Absence } from "../models/types";

@Injectable({
  providedIn: "root"
})
export class AbsenceService {
  private _absences = signal<Absence[]>([]);
  public absences = this._absences.asReadonly();

  private _loading = signal<boolean>(false);
  public loading = this._loading.asReadonly();

  constructor(private supabase: SupabaseService) {}

  /**
   * Fetch absences for a specific employee or all employees in a given year
   */
  async fetchAbsencesForYear(year: number): Promise<Absence[]> {
    this._loading.set(true);
    try {
      const startOfYear = `${year}-01-01`;
      const endOfYear = `${year}-12-31`;

      const { data, error } = await this.supabase.client
        .from("cd_absences")
        .select("*")
        .gte("date", startOfYear)
        .lte("date", endOfYear);

      if (error) throw error;
      const list = data || [];
      this._absences.set(list);
      return list;
    } catch (err) {
      console.error("Error fetching absences:", err);
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
        .from("cd_absences")
        .upsert(absences, { onConflict: "employee_id,date,period" })
        .select();

      if (error) throw error;
      await this.fetchAbsencesForYear(yearToRefresh);
      return data || [];
    } catch (err) {
      console.error("Error upserting absences:", err);
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
    yearToRefresh: number
  ): Promise<Absence[]> {
    try {
      if (datesToDelete.length > 0) {
        const { error: deleteError } = await this.supabase.client
          .from("cd_absences")
          .delete()
          .eq("employee_id", employeeId)
          .in("date", datesToDelete);
        
        if (deleteError) throw deleteError;
      }

      let data: Absence[] = [];
      if (newAbsences.length > 0) {
        const { data: upsertData, error: upsertError } = await this.supabase.client
          .from("cd_absences")
          .upsert(newAbsences, { onConflict: "employee_id,date,period" })
          .select();

        if (upsertError) throw upsertError;
        data = upsertData || [];
      }

      await this.fetchAbsencesForYear(yearToRefresh);
      return data;
    } catch (err) {
      console.error("Error replacing employee absences:", err);
      throw err;
    }
  }

  /**
   * Delete specific absence records
   */
  async deleteAbsences(ids: string[], yearToRefresh: number): Promise<void> {
    if (ids.length === 0) return;
    try {
      const { error } = await this.supabase.client
        .from("cd_absences")
        .delete()
        .in("id", ids);

      if (error) throw error;
      await this.fetchAbsencesForYear(yearToRefresh);
    } catch (err) {
      console.error("Error deleting absences:", err);
      throw err;
    }
  }

  /**
   * Delete absences for a specific employee and specific dates/periods
   */
  async deleteEmployeeAbsencesForDates(
    employeeId: string, 
    datePeriods: { date: string; period: 'full' | 'morning' | 'afternoon' }[], 
    yearToRefresh: number
  ): Promise<void> {
    if (datePeriods.length === 0) return;
    try {
      // Supabase OR condition or standard deletes
      // For simplicity and safety, we can delete them in a single query by generating the combinations
      // or querying the IDs first and deleting by ID.
      // Let's query matching records first
      const orConditions = datePeriods.map(dp => 
        `and(date.eq.${dp.date},period.eq.${dp.period})`
      ).join(",");
      
      const { data, error: selectError } = await this.supabase.client
        .from("cd_absences")
        .select("id")
        .eq("employee_id", employeeId)
        .or(orConditions);

      if (selectError) throw selectError;
      
      if (data && data.length > 0) {
        const ids = data.map(item => item.id);
        await this.deleteAbsences(ids, yearToRefresh);
      }
    } catch (err) {
      console.error("Error deleting employee absences for dates:", err);
      throw err;
    }
  }
}
