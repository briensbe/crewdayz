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
   * Fetch all employees from the Supabase cd_employees table
   */
  async fetchEmployees(): Promise<Employee[]> {
    this._loading.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from("cd_employees")
        .select("*")
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true });

      if (error) throw error;
      const list = data || [];
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
  async createEmployee(employee: Employee): Promise<Employee> {
    try {
      const { data, error } = await this.supabase.client
        .from("cd_employees")
        .insert([employee])
        .select()
        .single();

      if (error) throw error;
      await this.fetchEmployees();
      return data;
    } catch (err) {
      console.error("Error creating employee:", err);
      throw err;
    }
  }

  /**
   * Update an existing employee
   */
  async updateEmployee(id: string, employee: Partial<Employee>): Promise<Employee> {
    try {
      const { data, error } = await this.supabase.client
        .from("cd_employees")
        .update(employee)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      await this.fetchEmployees();
      return data;
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
