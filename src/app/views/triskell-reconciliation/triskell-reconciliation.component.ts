import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Download,
  Search,
  Filter,
  RefreshCw,
  X,
  ChevronRight,
  User,
  Calendar,
  Layers,
  ArrowUpDown,
  Building2,
  FileText,
} from 'lucide-angular';
import {
  TriskellReconciliationService,
  TriskellParseResult,
  MonthReconciliationSummary,
  ReconciliationRow,
  FRENCH_MONTHS_NAMES,
} from '../../services/triskell-reconciliation.service';
import { AbsenceService } from '../../services/absence.service';
import { EmployeeService } from '../../services/employee.service';
import { ToastService } from '../../services/toast.service';
import { normalizeString } from '../../shared/utils/string-utils';

export type SortColumn = 'name' | 'consumed' | 'worked' | 'diff' | 'status';

@Component({
  selector: 'app-triskell-reconciliation',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './triskell-reconciliation.component.html',
  styleUrl: './triskell-reconciliation.component.css',
})
export class TriskellReconciliationComponent implements OnInit {
  private readonly reconciliationService = inject(TriskellReconciliationService);
  private readonly absenceService = inject(AbsenceService);
  private readonly employeeService = inject(EmployeeService);
  private readonly toastService = inject(ToastService);

  // Icons
  readonly UploadCloud = UploadCloud;
  readonly FileSpreadsheet = FileSpreadsheet;
  readonly AlertTriangle = AlertTriangle;
  readonly CheckCircle2 = CheckCircle2;
  readonly HelpCircle = HelpCircle;
  readonly Download = Download;
  readonly Search = Search;
  readonly Filter = Filter;
  readonly RefreshCw = RefreshCw;
  readonly X = X;
  readonly ChevronRight = ChevronRight;
  readonly User = User;
  readonly Calendar = Calendar;
  readonly Layers = Layers;
  readonly ArrowUpDown = ArrowUpDown;
  readonly Building2 = Building2;
  readonly FileText = FileText;

  readonly frenchMonths = FRENCH_MONTHS_NAMES;

  // File state
  isDragging = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  fileName = signal<string>('');
  parseResult = signal<TriskellParseResult | null>(null);

  // View & Filters State
  selectedMonthIndex = signal<number>(new Date().getMonth());
  filterStatus = signal<'all' | 'anomalies' | 'unmatched' | 'ok'>('all');
  filterSection = signal<'all' | 'ESN' | 'Interne'>('all');
  searchQuery = signal<string>('');

  // Sort State
  sortCol = signal<SortColumn>('name');
  sortAsc = signal<boolean>(true);

  // Selected row for detail modal
  selectedDetailRow = signal<ReconciliationRow | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      await this.employeeService.fetchEmployees();
      const currentYear = new Date().getFullYear();
      if (this.absenceService.absences().length === 0) {
        await this.absenceService.fetchAbsencesForYear(currentYear);
      }
    } catch (e) {
      console.error('[Reconciliation] Error during ngOnInit:', e);
    }
  }

  // Handle Drag & Drop
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFile(input.files[0]);
    }
  }

  // Process File
  async processFile(file: File): Promise<void> {
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.xlsx') && !lowerName.endsWith('.xlsm') && !lowerName.endsWith('.xls')) {
      this.toastService.error('Veuillez déposer un fichier Excel valide (.xlsx ou .xlsm).');
      return;
    }

    this.isLoading.set(true);
    this.fileName.set(file.name);

    try {
      // Ensure employees are fetched if not yet available
      if (this.employeeService.employees().length === 0) {
        await this.employeeService.fetchEmployees();
      }

      const buffer = await file.arrayBuffer();
      const result = this.reconciliationService.parseTriskellWorkbook(buffer);

      // Ensure absences for detected year are loaded
      await this.absenceService.fetchAbsencesForYear(result.year);

      this.parseResult.set(result);

      // Select first available month
      if (result.availableMonths.length > 0) {
        if (!result.availableMonths.includes(this.selectedMonthIndex())) {
          this.selectedMonthIndex.set(result.availableMonths[0]);
        }
      }

      this.toastService.success(
        `Fichier analysé avec succès : ${result.rawEntries.length} lignes extraites pour l'année ${result.year}.`
      );
    } catch (err: any) {
      console.error('Erreur de parsing Triskell:', err);
      this.toastService.error(err.message || 'Erreur lors de la lecture du fichier Excel Triskell.');
      this.parseResult.set(null);
    } finally {
      this.isLoading.set(false);
    }
  }

  // Month summary computation
  currentMonthSummary = computed<MonthReconciliationSummary | null>(() => {
    const res = this.parseResult();
    if (!res) return null;

    const monthIdx = this.selectedMonthIndex();
    return this.reconciliationService.buildMonthReconciliation(res, monthIdx);
  });

  // Month anomaly counters for tabs
  monthAnomalyBadges = computed<{ [monthIdx: number]: number }>(() => {
    const res = this.parseResult();
    if (!res) return {};

    const badges: { [monthIdx: number]: number } = {};
    for (const m of res.availableMonths) {
      const summary = this.reconciliationService.buildMonthReconciliation(res, m);
      badges[m] = summary.anomalyCount;
    }
    return badges;
  });

  // Filtered & Sorted rows
  filteredRows = computed<ReconciliationRow[]>(() => {
    const summary = this.currentMonthSummary();
    if (!summary) return [];

    let rows = summary.rows;
    const status = this.filterStatus();
    const section = this.filterSection();
    const query = normalizeString(this.searchQuery());

    // Filter by status
    if (status === 'anomalies') {
      rows = rows.filter((r) => r.hasAnomaly && r.isMatched);
    } else if (status === 'unmatched') {
      rows = rows.filter((r) => !r.isMatched);
    } else if (status === 'ok') {
      rows = rows.filter((r) => !r.hasAnomaly && r.isMatched);
    }

    // Filter by section
    if (section !== 'all') {
      rows = rows.filter((r) => r.sectionType === section);
    }

    // Filter by search query
    if (query) {
      rows = rows.filter((r) => {
        const triskellName = normalizeString(r.resourceNameTriskell);
        const empName = r.employee
          ? normalizeString(`${r.employee.last_name} ${r.employee.first_name}`)
          : '';
        const supplier = normalizeString(r.supplier);
        const unit = normalizeString(r.unit);
        return (
          triskellName.includes(query) ||
          empName.includes(query) ||
          supplier.includes(query) ||
          unit.includes(query)
        );
      });
    }

    // Sort
    const col = this.sortCol();
    const asc = this.sortAsc();

    return [...rows].sort((a, b) => {
      let comparison = 0;
      switch (col) {
        case 'name':
          comparison = a.resourceNameTriskell.localeCompare(b.resourceNameTriskell, 'fr', {
            sensitivity: 'base',
          });
          break;
        case 'consumed':
          comparison = a.consumedDays - b.consumedDays;
          break;
        case 'worked':
          comparison = a.crewdayzWorkedDays - b.crewdayzWorkedDays;
          break;
        case 'diff':
          comparison = Math.abs(a.difference) - Math.abs(b.difference);
          break;
        case 'status':
          comparison = (a.isMatched ? (a.hasAnomaly ? 1 : 2) : 0) - (b.isMatched ? (b.hasAnomaly ? 1 : 2) : 0);
          break;
      }
      return asc ? comparison : -comparison;
    });
  });

  toggleSort(col: SortColumn): void {
    if (this.sortCol() === col) {
      this.sortAsc.update((v) => !v);
    } else {
      this.sortCol.set(col);
      this.sortAsc.set(true);
    }
  }

  selectMonth(monthIndex: number): void {
    this.selectedMonthIndex.set(monthIndex);
  }

  openRowDetail(row: ReconciliationRow): void {
    this.selectedDetailRow.set(row);
  }

  closeRowDetail(): void {
    this.selectedDetailRow.set(null);
  }

  exportCurrentMonth(): void {
    const summary = this.currentMonthSummary();
    if (!summary) return;
    this.reconciliationService.exportReconciliationToExcel(summary);
  }

  resetUpload(): void {
    this.parseResult.set(null);
    this.fileName.set('');
    this.selectedDetailRow.set(null);
  }
}
