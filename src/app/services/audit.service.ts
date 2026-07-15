import { Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuditLog } from '../models/types';
import { paginateQuery } from '../../utils/supabase-pagination';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root',
})
export class AuditService {
  private _logs = signal<AuditLog[]>([]);
  public logs = this._logs.asReadonly();

  private _loading = signal<boolean>(false);
  public loading = this._loading.asReadonly();

  constructor(
    private supabase: SupabaseService,
    private toastService: ToastService
  ) {}

  /**
   * Fetch audit logs from the Supabase audit_logs table, joining the profiles table to get full_name
   */
  async fetchAuditLogs(): Promise<AuditLog[]> {
    this._loading.set(true);
    try {
      const list = await paginateQuery<AuditLog>(
        () =>
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
            .order('id', { ascending: true }),
        {
          onWarning: (msg) => this.toastService.warning(`Attention (Logs d'audit) : ${msg}`),
        }
      );
      this._logs.set(list);
      return list;
    } catch (err: any) {
      console.error('Error fetching audit logs:', err);
      this.toastService.error(`Erreur de récupération des logs d'audit : ${err.message || err}`);
      throw err;
    } finally {
      this._loading.set(false);
    }
  }
}
