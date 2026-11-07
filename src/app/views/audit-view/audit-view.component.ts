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
  RotateCw,
  Database,
  ArrowRight,
  Eye,
  X,
} from 'lucide-angular';
import { AuditService } from '../../services/audit.service';
import { SupabaseService } from '../../services/supabase.service';
import { EmployeeService } from '../../services/employee.service';
import { AuditLog } from '../../models/types';
import { format, isSameDay, subDays, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { normalizeString } from '../../shared/utils/string-utils';
import { DB_TABLES } from '../../../constants/db-tables';

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
  styleUrl: './audit-view.component.css',
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
  readonly RotateCw = RotateCw;
  readonly Database = Database;
  readonly ArrowRight = ArrowRight;
  readonly Eye = Eye;
  readonly X = X;

  // State
  expandedLogs = signal<Set<string>>(new Set());
  showJsonRaw = signal<Record<string, boolean>>({}); // Log ID -> boolean to show raw JSON

  // Filters State
  searchQuery = signal('');
  selectedTable = signal('');
  selectedAction = signal('');
  selectedAuthor = signal('');
  selectedEmployeeId = signal('');
  datePreset = signal<'all' | 'today' | '7d' | '30d' | 'custom'>('all');
  customStartDate = signal('');
  customEndDate = signal('');

  // Translations maps
  readonly tableTranslations: Record<string, string> = {
    [DB_TABLES.EMPLOYEES]: 'Collaborateurs',
    [DB_TABLES.ABSENCES]: 'Absences',
    [DB_TABLES.EMPLOYEE_BALANCES]: 'Soldes des Collaborateurs',
    [DB_TABLES.AUDIT_LOGS]: "Logs d'Audit",
  };

  readonly fieldTranslations: Record<string, string> = {
    first_name: 'Prénom',
    last_name: 'Nom de famille',
    service: 'Service',
    team: 'Îlot',
    work_site: 'Site de travail',
    contract_type: 'Type de contrat',
    company_name: 'Société (ESN)',
    profile: 'Profil métier',
    arrival_date: "Date d'arrivée",
    departure_date: 'Date de départ',
    date: "Date de l'absence",
    period: 'Période',
    category: "Catégorie d'absence",
    comment: 'Commentaire',
    initial_cp: 'Solde initial CP',
    initial_rtt: 'Solde initial RTT',
    initial_exceptional: 'Solde initial Exceptionnel',
    year: 'Année',
    employee_id: 'ID Collaborateur',
  };

  // Unique lists computed for filters
  tables = computed(() => {
    const list = this.auditService.logs().map((log) => log.table_name);
    return Array.from(new Set(list)).sort();
  });

  actions = computed(() => {
    const list = this.auditService.logs().map((log) => log.action);
    return Array.from(new Set(list)).sort();
  });

  authors = computed(() => {
    const currentUserId = this.supabaseService.user()?.id;
    const authorMap = new Map<string, string>();
    let hasSystem = false;

    for (const log of this.auditService.logs()) {
      if (!log.changed_by) {
        hasSystem = true;
        continue;
      }
      if (!authorMap.has(log.changed_by)) {
        if (log.changed_by === currentUserId) {
          const email = this.supabaseService.user()?.email || 'Vous';
          authorMap.set(log.changed_by, `Vous (${email})`);
        } else if (log.profiles?.email) {
          authorMap.set(log.changed_by, log.profiles.email);
        } else {
          authorMap.set(log.changed_by, `Utilisateur (${log.changed_by.substring(0, 8)}...)`);
        }
      }
    }

    const list = Array.from(authorMap.entries()).map(([id, label]) => ({
      id,
      label,
    }));

    list.sort((a, b) => {
      if (a.id === currentUserId) return -1;
      if (b.id === currentUserId) return 1;
      return a.label.localeCompare(b.label);
    });

    if (hasSystem) {
      list.push({ id: '__system__', label: 'Système / Inconnu' });
    }

    return list;
  });

  targetEmployees = computed(() => {
    const empMap = new Map<string, string>();
    for (const log of this.auditService.logs()) {
      const empId = this.getRelatedEmployeeId(log);
      if (empId && !empMap.has(empId)) {
        const empName = this.getEmployeeName(empId);
        if (empName) {
          empMap.set(empId, empName);
        }
      }
    }

    return Array.from(empMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  hasActiveFilters = computed(() => {
    return (
      !!this.searchQuery().trim() ||
      !!this.selectedTable() ||
      !!this.selectedAction() ||
      !!this.selectedAuthor() ||
      !!this.selectedEmployeeId() ||
      this.datePreset() !== 'all' ||
      !!this.customStartDate() ||
      !!this.customEndDate()
    );
  });

  // Filtered Logs
  filteredLogs = computed(() => {
    const query = normalizeString(this.searchQuery()).trim();
    const table = this.selectedTable();
    const action = this.selectedAction();
    const author = this.selectedAuthor();
    const empId = this.selectedEmployeeId();
    const preset = this.datePreset();
    const customStart = this.customStartDate();
    const customEnd = this.customEndDate();
    const now = new Date();

    return this.auditService.logs().filter((log) => {
      // Table Filter
      if (table && log.table_name !== table) return false;

      // Action Filter
      if (action && log.action !== action) return false;

      // Author Filter
      if (author) {
        if (author === '__system__') {
          if (log.changed_by) return false;
        } else if (log.changed_by !== author) {
          return false;
        }
      }

      // Target Employee Filter ("Pour :")
      if (empId) {
        const relatedId = this.getRelatedEmployeeId(log);
        if (relatedId !== empId) return false;
      }

      // Date Filter
      if (preset !== 'all' && log.changed_at) {
        const logDate = new Date(log.changed_at);
        if (!isNaN(logDate.getTime())) {
          if (preset === 'today') {
            if (!isSameDay(logDate, now)) return false;
          } else if (preset === '7d') {
            const minDate = subDays(startOfDay(now), 6);
            if (logDate < minDate) return false;
          } else if (preset === '30d') {
            const minDate = subDays(startOfDay(now), 29);
            if (logDate < minDate) return false;
          } else if (preset === 'custom') {
            if (customStart) {
              const minDate = new Date(customStart + 'T00:00:00');
              if (logDate < minDate) return false;
            }
            if (customEnd) {
              const maxDate = new Date(customEnd + 'T23:59:59.999');
              if (logDate > maxDate) return false;
            }
          }
        }
      }

      // Text Search
      if (query) {
        const tableNameFr = normalizeString(this.translateTable(log.table_name));
        const userName = normalizeString(log.profiles?.email || '');
        const changedBy = normalizeString(log.changed_by || '');
        const actionStr = normalizeString(log.action);
        const rowId = normalizeString(log.row_id);
        const employeeName = normalizeString(this.getRelatedEmployee(log) || '');
        const oldDataStr = normalizeString(JSON.stringify(log.old_data || {}));
        const newDataStr = normalizeString(JSON.stringify(log.new_data || {}));

        return (
          tableNameFr.includes(query) ||
          userName.includes(query) ||
          changedBy.includes(query) ||
          actionStr.includes(query) ||
          rowId.includes(query) ||
          employeeName.includes(query) ||
          oldDataStr.includes(query) ||
          newDataStr.includes(query)
        );
      }

      return true;
    });
  });

  ngOnInit() {
    this.loadLogs();
    this.employeeService.fetchEmployees().catch((err) => console.error('Failed to load employees:', err));
  }

  async loadLogs() {
    try {
      await this.auditService.fetchAuditLogs();
    } catch (err) {
      console.error('Failed to load audit logs', err);
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
    this.showJsonRaw.update((state) => ({
      ...state,
      [logId]: show,
    }));
  }

  getShowRawJson(logId: string): boolean {
    return !!this.showJsonRaw()[logId];
  }

  getEmployeeName(id: string): string | null {
    const emp = this.employeeService.employees().find((e) => e.id === id);
    return emp ? `${(emp.last_name || '').toUpperCase()} ${emp.first_name}` : null;
  }

  getRelatedEmployeeId(log: AuditLog): string | null {
    if (log.table_name === DB_TABLES.EMPLOYEES) {
      return log.row_id;
    }
    return log.new_data?.employee_id || log.old_data?.employee_id || null;
  }

  getRelatedEmployee(log: AuditLog): string | null {
    const empId = this.getRelatedEmployeeId(log);
    return empId ? this.getEmployeeName(empId) : null;
  }

  filterByAuthor(authorId: string | null) {
    this.selectedAuthor.set(authorId || '__system__');
  }

  filterByEmployee(empId: string) {
    this.selectedEmployeeId.set(empId);
  }

  resetFilters() {
    this.searchQuery.set('');
    this.selectedTable.set('');
    this.selectedAction.set('');
    this.selectedAuthor.set('');
    this.selectedEmployeeId.set('');
    this.datePreset.set('all');
    this.customStartDate.set('');
    this.customEndDate.set('');
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
      Object.keys(newObj).forEach((key) => {
        if (!systemFields.includes(key) && newObj[key] !== null && newObj[key] !== undefined) {
          fields.push({
            key,
            label: this.translateField(key),
            oldValue: null,
            newValue: newObj[key],
            type: 'added',
          });
        }
      });
    } else if (log.action === 'DELETE') {
      Object.keys(oldObj).forEach((key) => {
        if (!systemFields.includes(key) && oldObj[key] !== null && oldObj[key] !== undefined) {
          fields.push({
            key,
            label: this.translateField(key),
            oldValue: oldObj[key],
            newValue: null,
            type: 'removed',
          });
        }
      });
    } else if (log.action === 'UPDATE') {
      // Gather all keys present in either object
      const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));

      allKeys.forEach((key) => {
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
              type: 'modified',
            });
          }
        }
      });
    }

    // Sort fields alphabetically by translated label
    return fields.sort((a, b) => a.label.localeCompare(b.label));
  }
}
