import { Injectable, signal } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import { Employee } from "../models/types";

@Injectable({
  providedIn: "root"
})
export class EmployeeService {
  private _employees = signal<Employee[]>([]);
  public employees = this._employees.asReadonly();
  
  private _loading = signal<boolean>(false);
  public loading = this._loading.asReadonly();

  constructor(private supabase: SupabaseService) {}

  /**
   * Fetch all employees from the Supabase cd_employees table along with their balances
   */
  async fetchEmployees(): Promise<Employee[]> {
    this._loading.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from("cd_employees")
        .select(`
          *,
          cd_employee_balances (*)
        `)
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true });

      if (error) throw error;
      const list = (data || []) as Employee[];
      this._employees.set(list);
      return list;
    } catch (err) {
      console.error("Error fetching employees:", err);
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
        .from("cd_employees")
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
        initial_exceptional: initial_exceptional ?? 0
      };

      const { error: balError } = await this.supabase.client
        .from("cd_employee_balances")
        .insert([balancePayload]);

      if (balError) throw balError;

      await this.fetchEmployees();
      return empData;
    } catch (err) {
      console.error("Error creating employee:", err);
      throw err;
    }
  }

  /**
   * Update an existing employee
   */
  async updateEmployee(id: string, employee: Partial<Employee>, year: number): Promise<Employee> {
    try {
      const { initial_cp, initial_rtt, initial_exceptional, cd_employee_balances, ...empFields } = employee;

      const { data: empData, error: empError } = await this.supabase.client
        .from("cd_employees")
        .update(empFields)
        .eq("id", id)
        .select()
        .single();

      if (empError) throw empError;

      // Upsert the balance for that year
      if (initial_cp !== undefined || initial_rtt !== undefined || initial_exceptional !== undefined) {
        const balancePayload = {
          employee_id: id,
          year: year,
          initial_cp: initial_cp ?? 0,
          initial_rtt: initial_rtt ?? 0,
          initial_exceptional: initial_exceptional ?? 0
        };

        const { error: balError } = await this.supabase.client
          .from("cd_employee_balances")
          .upsert(balancePayload, { onConflict: "employee_id,year" });

        if (balError) throw balError;
      }

      await this.fetchEmployees();
      return empData;
    } catch (err) {
      console.error("Error updating employee:", err);
      throw err;
    }
  }

  /**
   * Delete an employee
   */
  async deleteEmployee(id: string): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from("cd_employees")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await this.fetchEmployees();
    } catch (err) {
      console.error("Error deleting employee:", err);
      throw err;
    }
  }
}
