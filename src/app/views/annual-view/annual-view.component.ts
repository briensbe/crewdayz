import { Component, inject, signal, computed, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ChevronLeft, ChevronRight, BarChart3, Info, ArrowUp, ArrowDown, ArrowUpDown, Download, ChevronDown } from 'lucide-angular';
import { EmployeeService } from '../../services/employee.service';
import { AbsenceService } from '../../services/absence.service';
import { Employee, CONTRACT_DEFAULT_BALANCES } from '../../models/types';
import { FiltersComponent, FilterState } from '../../shared/filters/filters.component';
import { storageSignal } from '../../../utils/storage-signal';
import { isFrenchPublicHoliday } from '../../../utils/holidays';
import { getTeamStyle } from '../../shared/utils/color-utils';
import { normalizeString } from '../../shared/utils/string-utils';
import * as XLSX from 'xlsx';

interface EmployeeAnnualRow {
  employee: Employee;
  monthlyWorked: number[];
  decemberBalance: number;
  annualTotal: number;
}

export type EmployeeSortField = 'name' | 'contract_type' | 'service' | 'team' | 'work_site';

@Component({
  selector: 'app-annual-view',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, FiltersComponent],
  templateUrl: './annual-view.component.html',
  styleUrl: './annual-view.component.css',
})
export class AnnualViewComponent implements OnInit {
  // Services and dependencies
  protected readonly employeeService = inject(EmployeeService);
  protected readonly absenceService = inject(AbsenceService);
  protected readonly getTeamStyle = getTeamStyle;

  // Expose icons
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;
  readonly Info = Info;
  readonly ArrowUp = ArrowUp;
  readonly ArrowDown = ArrowDown;
  readonly ArrowUpDown = ArrowUpDown;
  readonly Download = Download;
  readonly ChevronDown = ChevronDown;

  // Export state
  showExportDropdown = signal<boolean>(false);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.export-dropdown-container')) {
      this.showExportDropdown.set(false);
    }
  }

  toggleExportDropdown() {
    this.showExportDropdown.update((v) => !v);
  }

  // Sort State
  sortField = storageSignal<EmployeeSortField>('crewdayz_annual_list_sort_field', 'name');
  sortDirection = storageSignal<'asc' | 'desc'>('crewdayz_annual_list_sort_direction', 'asc');

  toggleSort(field: EmployeeSortField) {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }
  }

  // Column Visibility State
  showColumns = storageSignal<boolean>('crewdayz_annual_show_columns', true);
  showServiceCol = computed(() => this.showColumns());
  showTeamCol = computed(() => this.showColumns());
  showSiteCol = computed(() => this.showColumns());
  showTypeCol = computed(() => this.showColumns());

  toggleColumns() {
    this.showColumns.set(!this.showColumns());
  }

  // Column positions for sticky columns
  teamColLeft = computed(() => {
    let pos = 150;
    if (this.showServiceCol()) pos += 100;
    return `${pos}px`;
  });

  siteColLeft = computed(() => {
    let pos = 150;
    if (this.showServiceCol()) pos += 100;
    if (this.showTeamCol()) pos += 80;
    return `${pos}px`;
  });

  typeColLeft = computed(() => {
    let pos = 150;
    if (this.showServiceCol()) pos += 100;
    if (this.showTeamCol()) pos += 80;
    if (this.showSiteCol()) pos += 90;
    return `${pos}px`;
  });

  lastVisibleStickyCol = computed(() => {
    if (this.showTypeCol()) return 'type';
    if (this.showSiteCol()) return 'site';
    if (this.showTeamCol()) return 'team';
    if (this.showServiceCol()) return 'service';
    return 'name';
  });

  // State
  year = signal<number>(new Date().getFullYear());
  months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jui', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

  // Filter State
  activeFilters = storageSignal<FilterState>('crewdayz_annual_view_filters', {
    search: '',
    service: [],
    team: [],
    work_site: [],
    contract_type: [],
    profile: [],
  });

  // Extract filter options dynamically
  services = computed(() => {
    const list = this.employeeService.employees().map((e) => e.service);
    return Array.from(new Set(list)).filter(Boolean).sort();
  });

  teams = computed(() => {
    const list = this.employeeService.employees().map((e) => e.team);
    return Array.from(new Set(list)).filter(Boolean).sort();
  });

  workSites = computed(() => {
    const list = this.employeeService.employees().map((e) => e.work_site);
    return Array.from(new Set(list)).filter(Boolean).sort();
  });

  profiles = computed(() => {
    const list = this.employeeService.employees().map((e) => e.profile);
    return Array.from(new Set(list)).filter(Boolean).sort();
  });

  // Filtered employees list
  filteredEmployees = computed(() => {
    const filters = this.activeFilters();
    const currentYear = this.year();
    const field = this.sortField();
    const direction = this.sortDirection();

    const list = this.employeeService.employees().filter((emp) => {
      // Exclude employees who departed in a previous year
      if (emp.departure_date) {
        const departureYear = parseInt(emp.departure_date.split('-')[0], 10);
        if (currentYear > departureYear) return false;
      }
      // Exclude employees who arrive in a future year
      if (emp.arrival_date) {
        const arrivalYear = parseInt(emp.arrival_date.split('-')[0], 10);
        if (currentYear < arrivalYear) return false;
      }
      if (filters.search) {
        const query = normalizeString(filters.search);
        const fullName = normalizeString(`${emp.first_name} ${emp.last_name}`);
        const matchesName = fullName.includes(query);
        const matchesCompany = normalizeString(emp.company_name).includes(query);
        if (!matchesName && !matchesCompany) return false;
      }
      if (filters.service && filters.service.length > 0 && !filters.service.includes(emp.service)) return false;
      if (filters.team && filters.team.length > 0 && !filters.team.includes(emp.team)) return false;
      if (filters.work_site && filters.work_site.length > 0 && !filters.work_site.includes(emp.work_site)) return false;
      if (
        filters.contract_type &&
        filters.contract_type.length > 0 &&
        !filters.contract_type.includes(emp.contract_type)
      )
        return false;
      if (filters.profile && filters.profile.length > 0 && !filters.profile.includes(emp.profile)) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      let comparison = 0;
      switch (field) {
        case 'name': {
          const nameA = `${a.last_name || ''} ${a.first_name || ''}`.toLowerCase();
          const nameB = `${b.last_name || ''} ${b.first_name || ''}`.toLowerCase();
          comparison = nameA.localeCompare(nameB, 'fr', { sensitivity: 'base' });
          break;
        }
        case 'contract_type': {
          const valA = `${a.contract_type || ''} ${a.company_name || ''}`.toLowerCase();
          const valB = `${b.contract_type || ''} ${b.company_name || ''}`.toLowerCase();
          comparison = valA.localeCompare(valB, 'fr', { sensitivity: 'base' });
          break;
        }
        case 'service':
          comparison = (a.service || '').localeCompare(b.service || '', 'fr', { sensitivity: 'base' });
          break;
        case 'team':
          comparison = (a.team || '').localeCompare(b.team || '', 'fr', { sensitivity: 'base' });
          break;
        case 'work_site':
          comparison = (a.work_site || '').localeCompare(b.work_site || '', 'fr', { sensitivity: 'base' });
          break;
        default:
          comparison = 0;
      }
      return direction === 'asc' ? comparison : -comparison;
    });
  });

  private calculateAnnualRow(emp: Employee, abs: any[], y: number): EmployeeAnnualRow {
    const monthlyWorked: number[] = [];
    let workedDaysSum = 0;

    for (let m = 0; m < 12; m++) {
      // Calculate total days in month
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      let businessDaysCount = 0;

      // Count Mon-Fri business days (excluding holidays, days before arrival and days after departure)
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(y, m, d);
        const mm = String(m + 1).padStart(2, '0');
        const dd = String(d).padStart(2, '0');
        const dateStr = `${y}-${mm}-${dd}`;

        if (emp.arrival_date && dateStr < emp.arrival_date) {
          continue;
        }
        if (emp.departure_date && dateStr >= emp.departure_date) {
          continue;
        }

        const dayOfWeek = date.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isFrenchPublicHoliday(date)) {
          businessDaysCount++;
        }
      }

      // Count absences that reduce working days (exclude Formation, filter active year/month, ensure business days and not holiday)
      const absencesInMonth = abs.filter((a) => {
        if (a.employee_id !== emp.id) return false;
        if (a.category === 'Formation') return false; // Formation doesn't reduce worked days
        if (emp.arrival_date && a.date < emp.arrival_date) return false;
        if (emp.departure_date && a.date >= emp.departure_date) return false;

        const absDate = new Date(a.date);
        if (absDate.getFullYear() !== y || absDate.getMonth() !== m) return false;

        const dayOfWeek = absDate.getDay();
        return dayOfWeek !== 0 && dayOfWeek !== 6 && !isFrenchPublicHoliday(absDate);
      });

      // Sum absences per day to avoid double counting if multiple half-days exist on same day
      const dateMap = new Map<string, number>();
      absencesInMonth.forEach((a) => {
        const current = dateMap.get(a.date) || 0;
        dateMap.set(a.date, current + (a.period === 'full' ? 1.0 : 0.5));
      });

      let totalAbsenceDays = 0;
      dateMap.forEach((val) => {
        totalAbsenceDays += Math.min(val, 1.0);
      });

      const worked = Math.max(businessDaysCount - totalAbsenceDays, 0);
      monthlyWorked.push(worked);
      workedDaysSum += worked;
    }

    // Calculate December balance (solde restant à fin Décembre)
    const balance = emp.cd_employee_balances?.find((b) => b.year === y);
    const defaults =
      emp.contract_type === 'Interne' ? CONTRACT_DEFAULT_BALANCES.Interne : CONTRACT_DEFAULT_BALANCES.Externe;

    const initialCp = balance ? balance.initial_cp : defaults.initial_cp;
    const initialRtt = balance ? balance.initial_rtt : defaults.initial_rtt;
    const initialExceptional = balance ? balance.initial_exceptional : defaults.initial_exceptional;
    const initial = initialCp + initialRtt + initialExceptional;

    const usedInYear = abs
      .filter((a) => {
        if (a.employee_id !== emp.id) return false;
        if (a.category === 'Formation') return false;
        const absDate = new Date(a.date);
        return absDate.getFullYear() === y;
      })
      .reduce((sum, a) => {
        return sum + (a.period === 'full' ? 1.0 : 0.5);
      }, 0);

    let decemberBalance = initial - usedInYear;
    if (emp.departure_date) {
      const departureYear = parseInt(emp.departure_date.split('-')[0], 10);
      if (departureYear <= y) {
        decemberBalance = 0;
      }
    }
    const annualTotal = workedDaysSum - decemberBalance;

    return {
      employee: emp,
      monthlyWorked,
      decemberBalance,
      annualTotal,
    };
  }

  // Main list showing calculated worked days for each month & annual totals
  employeesAnnualRows = computed<EmployeeAnnualRow[]>(() => {
    const emps = this.filteredEmployees();
    const abs = this.absenceService.absences();
    const y = this.year();

    return emps.map((emp) => this.calculateAnnualRow(emp, abs, y));
  });

  // Calculate sum of worked days for all filtered employees (by month and grand total)
  totals = computed(() => {
    const rows = this.employeesAnnualRows();
    const monthlySum = Array(12).fill(0);
    let grandSum = 0;
    let balanceSum = 0;

    rows.forEach((r) => {
      for (let m = 0; m < 12; m++) {
        monthlySum[m] += r.monthlyWorked[m];
      }
      grandSum += r.annualTotal;
      balanceSum += r.decemberBalance;
    });

    return {
      monthly: monthlySum,
      grand: grandSum,
      balance: balanceSum,
    };
  });

  exportExcel(mode: 'all' | 'filtered') {
    let rowsToExport: EmployeeAnnualRow[] = [];
    const abs = this.absenceService.absences();
    const y = this.year();

    if (mode === 'filtered') {
      rowsToExport = this.employeesAnnualRows();
    } else {
      // Calculate rows for ALL active employees in the selected year
      const allActiveEmps = this.employeeService.employees().filter((emp) => {
        if (emp.departure_date) {
          const departureYear = parseInt(emp.departure_date.split('-')[0], 10);
          if (y > departureYear) return false;
        }
        if (emp.arrival_date) {
          const arrivalYear = parseInt(emp.arrival_date.split('-')[0], 10);
          if (y < arrivalYear) return false;
        }
        return true;
      });

      // Sort by name
      const sortedActive = [...allActiveEmps].sort((a, b) => {
        const nameA = `${a.last_name || ''} ${a.first_name || ''}`.toLowerCase();
        const nameB = `${b.last_name || ''} ${b.first_name || ''}`.toLowerCase();
        return nameA.localeCompare(nameB, 'fr', { sensitivity: 'base' });
      });

      rowsToExport = sortedActive.map((emp) => this.calculateAnnualRow(emp, abs, y));
    }

    // Map to worksheet format
    const data = rowsToExport.map((r) => ({
      'Collaborateur': `${r.employee.first_name} ${r.employee.last_name}`,
      'Service': r.employee.service || '',
      'Équipe': r.employee.team || '',
      'Site': r.employee.work_site || '',
      'Type de contrat': (r.employee.contract_type || '') as string,
      'Janvier': r.monthlyWorked[0],
      'Février': r.monthlyWorked[1],
      'Mars': r.monthlyWorked[2],
      'Avril': r.monthlyWorked[3],
      'Mai': r.monthlyWorked[4],
      'Juin': r.monthlyWorked[5],
      'Juillet': r.monthlyWorked[6],
      'Août': r.monthlyWorked[7],
      'Septembre': r.monthlyWorked[8],
      'Octobre': r.monthlyWorked[9],
      'Novembre': r.monthlyWorked[10],
      'Décembre': r.monthlyWorked[11],
      'Solde Déc.': r.decemberBalance,
      'Total Annuel': r.annualTotal,
    }));

    // Add sum totals row at the bottom
    const totalMonthly = Array(12).fill(0);
    let totalDecemberBalance = 0;
    let totalAnnualTotal = 0;

    rowsToExport.forEach((r) => {
      for (let m = 0; m < 12; m++) {
        totalMonthly[m] += r.monthlyWorked[m];
      }
      totalDecemberBalance += r.decemberBalance;
      totalAnnualTotal += r.annualTotal;
    });

    data.push({
      'Collaborateur': 'TOTAL CUMULÉ',
      'Service': '',
      'Équipe': '',
      'Site': '',
      'Type de contrat': '',
      'Janvier': totalMonthly[0],
      'Février': totalMonthly[1],
      'Mars': totalMonthly[2],
      'Avril': totalMonthly[3],
      'Mai': totalMonthly[4],
      'Juin': totalMonthly[5],
      'Juillet': totalMonthly[6],
      'Août': totalMonthly[7],
      'Septembre': totalMonthly[8],
      'Octobre': totalMonthly[9],
      'Novembre': totalMonthly[10],
      'Décembre': totalMonthly[11],
      'Solde Déc.': totalDecemberBalance,
      'Total Annuel': totalAnnualTotal,
    });

    // Generate XLSX workbook & download it
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Synthèse ${y}`);

    const fileName = `Export_Annuel_${y}_${mode === 'filtered' ? 'filtre' : 'tous'}.xlsx`;
    XLSX.writeFile(wb, fileName);
    this.showExportDropdown.set(false);
  }

  ngOnInit() {
    this.employeeService.fetchEmployees();
    this.fetchAbsencesForYear();
  }

  async fetchAbsencesForYear() {
    await this.absenceService.fetchAbsencesForYear(this.year());
  }

  prevYear() {
    this.year.update((y) => y - 1);
    this.fetchAbsencesForYear();
  }

  nextYear() {
    this.year.update((y) => y + 1);
    this.fetchAbsencesForYear();
  }

  handleFilterChange(newFilters: FilterState) {
    this.activeFilters.set(newFilters);
  }
}
