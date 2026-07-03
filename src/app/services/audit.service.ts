import { Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuditLog } from '../models/types';
import { paginateQuery } from '../../utils/supabase-pagination';

@Injectable({
  providedIn: 'root',
})
export class AuditService {
  private _logs = signal<AuditLog[]>([]);
  public logs = this._logs.asReadonly();

  private _loading = signal<boolean>(false);
  public loading = this._loading.asReadonly();

  constructor(private supabase: SupabaseService) {}

  /**
   * Fetch audit logs from the Supabase audit_logs table, joining the profiles table to get full_name
   */
  async fetchAuditLogs(): Promise<AuditLog[]> {
    this._loading.set(true);
    try {
      const list = await paginateQuery<AuditLog>(() =>
        this.supabase.client
          .from('audit_logs')
          .select(
            `
            *,
            profiles:changed_by (
              full_name
            )
          `,
          )
          .order('changed_at', { ascending: false })
      );
      this._logs.set(list);
      return list;
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      throw err;
    } finally {
      this._loading.set(false);
    }
  }
}
