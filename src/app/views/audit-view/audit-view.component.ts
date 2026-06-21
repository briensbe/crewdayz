import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  LucideAngularModule, 
  History, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  User, 
  Calendar, 
  FileText, 
  Filter, 
  RefreshCw,
  Database,
  ArrowRight,
  Eye
} from 'lucide-angular';
import { AuditService } from '../../services/audit.service';
import { SupabaseService } from '../../services/supabase.service';
import { EmployeeService } from '../../services/employee.service';
import { AuditLog } from '../../models/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ChangedField {
  key: string;
  label: string;
  oldValue: any;
  newValue: any;
  type: 'added' | 'removed' | 'modified';
}

@Component({
  selector: 'app-audit-view',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './audit-view.component.html',
  styleUrl: './audit-view.component.css'
})
export class AuditViewComponent implements OnInit {
  protected readonly auditService = inject(AuditService);
  protected readonly supabaseService = inject(SupabaseService);
  protected readonly employeeService = inject(EmployeeService);

  // Expose icons
  readonly History = History;
  readonly Search = Search;
  readonly ChevronDown = ChevronDown;
  readonly ChevronUp = ChevronUp;
  readonly User = User;
  readonly Calendar = Calendar;
  readonly FileText = FileText;
  readonly Filter = Filter;
  readonly RefreshCw = RefreshCw;
  readonly Database = Database;
  readonly ArrowRight = ArrowRight;
  readonly Eye = Eye;

  // State
  expandedLogs = signal<Set<string>>(new Set());
  showJsonRaw = signal<Record<string, boolean>>({}); // Log ID -> boolean to show raw JSON

  // Filters State
  searchQuery = signal('');
  selectedTable = signal('');
  selectedAction = signal('');

  // Translations maps
  readonly tableTranslations: Record<string, string> = {
    'cd_employees': 'Collaborateurs',
    'cd_absences': 'Absences',
    'cd_employee_balances': 'Soldes des Collaborateurs',
    'audit_logs': 'Logs d\'Audit'
  };

  readonly fieldTranslations: Record<string, string> = {
    'first_name': 'Prénom',
    'last_name': 'Nom de famille',
    'service': 'Service',
    'team': 'Îlot',
    'work_site': 'Site de travail',
    'contract_type': 'Type de contrat',
    'company_name': 'Société (ESN)',
    'profile': 'Profil métier',
    'arrival_date': 'Date d\'arrivée',
    'departure_date': 'Date de départ',
    'date': 'Date de l\'absence',
    'period': 'Période',
    'category': 'Catégorie d\'absence',
    'comment': 'Commentaire',
    'initial_cp': 'Solde initial CP',
    'initial_rtt': 'Solde initial RTT',
    'initial_exceptional': 'Solde initial Exceptionnel',
    'year': 'Année',
    'employee_id': 'ID Collaborateur'
  };

  // Unique lists computed for filters
  tables = computed(() => {
    const list = this.auditService.logs().map(log => log.table_name);
    return Array.from(new Set(list)).sort();
  });

  actions = computed(() => {
    const list = this.auditService.logs().map(log => log.action);
    return Array.from(new Set(list)).sort();
  });

  // Filtered Logs
  filteredLogs = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const table = this.selectedTable();
    const action = this.selectedAction();

    return this.auditService.logs().filter(log => {
      // Table Filter
      if (table && log.table_name !== table) return false;

      // Action Filter
      if (action && log.action !== action) return false;

      // Text Search
      if (query) {
        const tableNameFr = this.translateTable(log.table_name).toLowerCase();
        const userName = (log.profiles?.full_name || '').toLowerCase();
        const changedBy = (log.changed_by || '').toLowerCase();
        const actionStr = log.action.toLowerCase();
        const rowId = log.row_id.toLowerCase();
        const oldDataStr = JSON.stringify(log.old_data || {}).toLowerCase();
        const newDataStr = JSON.stringify(log.new_data || {}).toLowerCase();

        return tableNameFr.includes(query) ||
               userName.includes(query) ||
               changedBy.includes(query) ||
               actionStr.includes(query) ||
               rowId.includes(query) ||
               oldDataStr.includes(query) ||
               newDataStr.includes(query);
      }

      return true;
    });
  });

  ngOnInit() {
    this.loadLogs();
    this.employeeService.fetchEmployees().catch(err => console.error("Failed to load employees:", err));
  }

  async loadLogs() {
    try {
      await this.auditService.fetchAuditLogs();
    } catch (err) {
      console.error("Failed to load audit logs", err);
    }
  }

  toggleExpand(logId: string) {
    const current = new Set(this.expandedLogs());
    if (current.has(logId)) {
      current.delete(logId);
    } else {
      current.add(logId);
    }
    this.expandedLogs.set(current);
  }

  isExpanded(logId: string): boolean {
    return this.expandedLogs().has(logId);
  }

  toggleRawJson(logId: string, show: boolean) {
    this.showJsonRaw.update(state => ({
      ...state,
      [logId]: show
    }));
  }

  getShowRawJson(logId: string): boolean {
    return !!this.showJsonRaw()[logId];
  }

  getEmployeeName(id: string): string | null {
    const emp = this.employeeService.employees().find(e => e.id === id);
    return emp ? `${emp.first_name} ${emp.last_name}` : null;
  }

  getRelatedEmployee(log: AuditLog): string | null {
    if (log.table_name === 'cd_employees') {
      return this.getEmployeeName(log.row_id);
    }
    const empId = log.new_data?.employee_id || log.old_data?.employee_id;
    if (empId) {
      return this.getEmployeeName(empId);
    }
    return null;
  }

  translateTable(table: string): string {
    return this.tableTranslations[table] || table;
  }

  translateField(field: string): string {
    return this.fieldTranslations[field] || field;
  }

  formatValue(key: string, val: any): string {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'boolean') return val ? 'Oui' : 'Non';

    if (key === 'employee_id') {
      const name = this.getEmployeeName(val);
      return name ? `${name} (ID: ${val.substring(0, 8)}...)` : String(val);
    }

    if (key === 'period') {
      if (val === 'full') return 'Journée entière';
      if (val === 'morning') return 'Matin';
      if (val === 'afternoon') return 'Après-midi';
    }

    return String(val);
  }

  formatDate(dateStr: string): string {
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy HH:mm:ss', { locale: fr });
    } catch {
      return dateStr;
    }
  }

  getChangedFields(log: AuditLog): ChangedField[] {
    const fields: ChangedField[] = [];
    const oldObj = log.old_data || {};
    const newObj = log.new_data || {};

    const systemFields = ['id', 'created_at', 'updated_at', 'changed_at', 'changed_by'];

    if (log.action === 'INSERT') {
      Object.keys(newObj).forEach(key => {
        if (!systemFields.includes(key) && newObj[key] !== null && newObj[key] !== undefined) {
          fields.push({
            key,
            label: this.translateField(key),
            oldValue: null,
            newValue: newObj[key],
            type: 'added'
          });
        }
      });
    } else if (log.action === 'DELETE') {
      Object.keys(oldObj).forEach(key => {
        if (!systemFields.includes(key) && oldObj[key] !== null && oldObj[key] !== undefined) {
          fields.push({
            key,
            label: this.translateField(key),
            oldValue: oldObj[key],
            newValue: null,
            type: 'removed'
          });
        }
      });
    } else if (log.action === 'UPDATE') {
      // Gather all keys present in either object
      const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));

      allKeys.forEach(key => {
        if (!systemFields.includes(key)) {
          const oldVal = oldObj[key];
          const newVal = newObj[key];

          // Compare to check value equality
          if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            fields.push({
              key,
              label: this.translateField(key),
              oldValue: oldVal,
              newValue: newVal,
              type: 'modified'
            });
          }
        }
      });
    }

    // Sort fields alphabetically by translated label
    return fields.sort((a, b) => a.label.localeCompare(b.label));
  }
}
