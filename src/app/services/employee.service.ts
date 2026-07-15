import { Injectable, signal, OnDestroy } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Employee, EmployeeBalance } from '../models/types';
import { RealtimeChannel } from '@supabase/supabase-js';
import { paginateQuery } from '../../utils/supabase-pagination';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root',
})
export class EmployeeService implements OnDestroy {
  private _employees = signal<Employee[]>([]);
  public employees = this._employees.asReadonly();

  private _loading = signal<boolean>(false);
  public loading = this._loading.asReadonly();

  private realtimeChannel: RealtimeChannel | null = null;

  constructor(
    private supabase: SupabaseService,
    private toastService: ToastService
  ) {
    this.setupRealtimeSubscription();
  }

  /**
   * Set up the Supabase Realtime subscription for 'cd_employees' and 'cd_employee_balances' tables.
   */
  private setupRealtimeSubscription() {
    this.realtimeChannel = this.supabase.client
      .channel('cd-employees-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'crewdayz',
          table: 'cd_employees',
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          console.log(`[EmployeeService] Realtime event on cd_employees: ${eventType}`, payload);

          this._employees.update((currentEmployees) => {
            if (eventType === 'INSERT') {
              const record = newRecord as Employee;
              // Avoid duplicate additions
              const exists = currentEmployees.some((emp) => emp.id === record.id);
              if (exists) return currentEmployees;

              const list = [...currentEmployees, { ...record, cd_employee_balances: [] }];
              return this.sortEmployees(list);
            }

            if (eventType === 'UPDATE') {
              const record = newRecord as Employee;
              const list = currentEmployees.map((emp) => {
                if (emp.id === record.id) {
                  // Keep existing balances during employee table updates
                  return { ...emp, ...record };
                }
                return emp;
              });
              return this.sortEmployees(list);
            }

            if (eventType === 'DELETE') {
              const idToDelete = (oldRecord as { id: string }).id;
              return currentEmployees.filter((emp) => emp.id !== idToDelete);
            }

            return currentEmployees;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'crewdayz',
          table: 'cd_employee_balances',
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          console.log(`[EmployeeService] Realtime event on cd_employee_balances: ${eventType}`, payload);

          this._employees.update((currentEmployees) => {
            if (eventType === 'INSERT' || eventType === 'UPDATE') {
              const balance = newRecord as EmployeeBalance;
              return currentEmployees.map((emp) => {
                if (emp.id === balance.employee_id) {
                  const balances = [...(emp.cd_employee_balances || [])];
                  const index = balances.findIndex((b) => b.year === balance.year);

                  if (index >= 0) {
                    balances[index] = balance;
                  } else {
                    balances.push(balance);
                  }
                  return { ...emp, cd_employee_balances: balances };
                }
                return emp;
              });
            }

            if (eventType === 'DELETE') {
              const delRecord = oldRecord as { id?: string; employee_id?: string; year?: number };
              return currentEmployees.map((emp) => {
                if (delRecord.employee_id && emp.id !== delRecord.employee_id) {
                  return emp;
                }
                const balances = (emp.cd_employee_balances || []).filter((b) => {
                  if (delRecord.id) return b.id !== delRecord.id;
                  if (delRecord.year) return b.year !== delRecord.year;
                  return true;
                });
                return { ...emp, cd_employee_balances: balances };
              });
            }

            return currentEmployees;
          });
        }
      )
      .subscribe((status) => {
        console.log(`[EmployeeService] Realtime connection status for employees: ${status}`);
      });
  }

  private sortEmployees(list: Employee[]): Employee[] {
    return list.sort((a, b) => {
      const lnCompare = (a.last_name || '').localeCompare(b.last_name || '');
      if (lnCompare !== 0) return lnCompare;
      return (a.first_name || '').localeCompare(b.first_name || '');
    });
  }

  ngOnDestroy() {
    if (this.realtimeChannel) {
      this.supabase.client.removeChannel(this.realtimeChannel);
    }
  }


  /**
   * Fetch all employees from the Supabase cd_employees table along with their balances
   */
  async fetchEmployees(): Promise<Employee[]> {
    this._loading.set(true);
    try {
      const list = await paginateQuery<Employee>(
        () =>
          this.supabase.client
            .from('cd_employees')
            .select(
              `
              *,
              cd_employee_balances (*)
            `,
            )
            .order('last_name', { ascending: true })
            .order('first_name', { ascending: true })
            .order('id', { ascending: true }),
        {
          onWarning: (msg) => this.toastService.warning(`Attention (Employés) : ${msg}`),
        }
      );
      this._employees.set(list);
      return list;
    } catch (err: any) {
      console.error('Error fetching employees:', err);
      this.toastService.error(`Erreur de récupération des employés : ${err.message || err}`);
      throw err;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Create a new employee
   */
  async createEmployee(employee: Employee, year: number): Promise<Employee> {
    try {
      const { initial_cp, initial_rtt, initial_exceptional, cd_employee_balances, ...empFields } = employee;

      const { data: empData, error: empError } = await this.supabase.client
        .from('cd_employees')
        .insert([empFields])
        .select()
        .single();

      if (empError) throw empError;

      // Insert initial balance for the given year
      const balancePayload = {
        employee_id: empData.id,
        year: year,
        initial_cp: initial_cp ?? 0,
        initial_rtt: initial_rtt ?? 0,
        initial_exceptional: initial_exceptional ?? 0,
      };

      const { error: balError } = await this.supabase.client.from('cd_employee_balances').insert([balancePayload]);

      if (balError) throw balError;

      const newEmp: Employee = {
        ...empData,
        cd_employee_balances: [balancePayload],
      };

      this._employees.update((employees) => {
        const list = [...employees, newEmp];
        return list.sort((a, b) => {
          const lnCompare = (a.last_name || '').localeCompare(b.last_name || '');
          if (lnCompare !== 0) return lnCompare;
          return (a.first_name || '').localeCompare(b.first_name || '');
        });
      });

      return newEmp;
    } catch (err) {
      console.error('Error creating employee:', err);
      throw err;
    }
  }

  async updateEmployee(id: string, employee: Partial<Employee>, year: number): Promise<Employee> {
    try {
      const { initial_cp, initial_rtt, initial_exceptional, cd_employee_balances, ...empFields } = employee;

      const { data: empData, error: empError } = await this.supabase.client
        .from('cd_employees')
        .update(empFields)
        .eq('id', id)
        .select()
        .single();

      if (empError) throw empError;

      // Check if balances actually changed compared to current local state
      const existingEmployee = this._employees().find((e) => e.id === id);
      const existingBalance = existingEmployee?.cd_employee_balances?.find((b) => b.year === year);

      const currentCp = existingBalance?.initial_cp ?? 0;
      const currentRtt = existingBalance?.initial_rtt ?? 0;
      const currentExceptional = existingBalance?.initial_exceptional ?? 0;

      const newCp = initial_cp !== undefined ? initial_cp : currentCp;
      const newRtt = initial_rtt !== undefined ? initial_rtt : currentRtt;
      const newExceptional = initial_exceptional !== undefined ? initial_exceptional : currentExceptional;

      const hasBalanceChanges = newCp !== currentCp || newRtt !== currentRtt || newExceptional !== currentExceptional;

      // Upsert the balance for that year ONLY if they changed
      if (hasBalanceChanges) {
        const balancePayload = {
          employee_id: id,
          year: year,
          initial_cp: newCp,
          initial_rtt: newRtt,
          initial_exceptional: newExceptional,
        };

        const { error: balError } = await this.supabase.client
          .from('cd_employee_balances')
          .upsert(balancePayload, { onConflict: 'employee_id,year' });

        if (balError) throw balError;
      }

      this._employees.update((employees) => {
        const updatedList = employees.map((emp) => {
          if (emp.id === id) {
            const balances = [...(emp.cd_employee_balances || [])];
            if (hasBalanceChanges) {
              const balanceIndex = balances.findIndex((b) => b.year === year);
              const newBalance = {
                employee_id: id,
                year: year,
                initial_cp: newCp,
                initial_rtt: newRtt,
                initial_exceptional: newExceptional,
              };

              if (balanceIndex >= 0) {
                balances[balanceIndex] = { ...balances[balanceIndex], ...newBalance };
              } else {
                balances.push(newBalance);
              }
            }
            return {
              ...emp,
              ...empFields,
              cd_employee_balances: balances,
            };
          }
          return emp;
        });

        return updatedList.sort((a, b) => {
          const lnCompare = (a.last_name || '').localeCompare(b.last_name || '');
          if (lnCompare !== 0) return lnCompare;
          return (a.first_name || '').localeCompare(b.first_name || '');
        });
      });

      return empData;
    } catch (err) {
      console.error('Error updating employee:', err);
      throw err;
    }
  }

  /**
   * Delete an employee
   */
  async deleteEmployee(id: string): Promise<void> {
    try {
      const { error } = await this.supabase.client.from('cd_employees').delete().eq('id', id);

      if (error) throw error;

      this._employees.update((employees) => employees.filter((emp) => emp.id !== id));
    } catch (err) {
      console.error('Error deleting employee:', err);
      throw err;
    }
  }
}
