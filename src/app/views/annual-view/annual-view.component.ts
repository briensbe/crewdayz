import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ChevronLeft, ChevronRight, BarChart3, Info } from 'lucide-angular';
import { EmployeeService } from '../../services/employee.service';
import { AbsenceService } from '../../services/absence.service';
import { Employee, CONTRACT_DEFAULT_BALANCES } from '../../models/types';
import { FiltersComponent, FilterState } from '../../shared/filters/filters.component';
import { storageSignal } from '../../../utils/storage-signal';
import { isFrenchPublicHoliday } from '../../../utils/holidays';
import { getTeamStyle } from '../../shared/utils/color-utils';

interface EmployeeAnnualRow {
  employee: Employee;
  monthlyWorked: number[];
  decemberBalance: number;
  annualTotal: number;
}

@Component({
  selector: 'app-annual-view',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, FiltersComponent],
  templateUrl: './annual-view.component.html',
  styleUrl: './annual-view.component.css'
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
    service: '',
    team: '',
    work_site: '',
    contract_type: ''
  });

  // Extract filter options dynamically
  services = computed(() => {
    const list = this.employeeService.employees().map(e => e.service);
    return Array.from(new Set(list)).filter(Boolean).sort();
  });

  teams = computed(() => {
    const list = this.employeeService.employees().map(e => e.team);
    return Array.from(new Set(list)).filter(Boolean).sort();
  });

  workSites = computed(() => {
    const list = this.employeeService.employees().map(e => e.work_site);
    return Array.from(new Set(list)).filter(Boolean).sort();
  });

  // Filtered employees list
  filteredEmployees = computed(() => {
    const filters = this.activeFilters();
    const currentYear = this.year();
    return this.employeeService.employees().filter(emp => {
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
        const query = filters.search.toLowerCase();
        const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
        const matchesName = fullName.includes(query);
        const matchesCompany = emp.company_name?.toLowerCase().includes(query) || false;
        if (!matchesName && !matchesCompany) return false;
      }
      if (filters.service && emp.service !== filters.service) return false;
      if (filters.team && emp.team !== filters.team) return false;
      if (filters.work_site && emp.work_site !== filters.work_site) return false;
      if (filters.contract_type && emp.contract_type !== filters.contract_type) return false;
      return true;
    });
  });

  // Main list showing calculated worked days for each month & annual totals
  employeesAnnualRows = computed<EmployeeAnnualRow[]>(() => {
    const emps = this.filteredEmployees();
    const abs = this.absenceService.absences();
    const y = this.year();

    return emps.map(emp => {
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
          if (emp.departure_date && dateStr > emp.departure_date) {
            continue;
          }

          const dayOfWeek = date.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isFrenchPublicHoliday(date)) {
            businessDaysCount++;
          }
        }

        // Count absences that reduce working days (exclude Formation, filter active year/month, ensure business days and not holiday)
        const absencesInMonth = abs.filter(a => {
          if (a.employee_id !== emp.id) return false;
          if (a.category === 'Formation') return false; // Formation doesn't reduce worked days
          if (emp.arrival_date && a.date < emp.arrival_date) return false;
          if (emp.departure_date && a.date > emp.departure_date) return false;
          
          const absDate = new Date(a.date);
          if (absDate.getFullYear() !== y || absDate.getMonth() !== m) return false;
          
          const dayOfWeek = absDate.getDay();
          return dayOfWeek !== 0 && dayOfWeek !== 6 && !isFrenchPublicHoliday(absDate);
        });

        // Sum absences per day to avoid double counting if multiple half-days exist on same day
        const dateMap = new Map<string, number>();
        absencesInMonth.forEach(a => {
          const current = dateMap.get(a.date) || 0;
          dateMap.set(a.date, current + (a.period === 'full' ? 1.0 : 0.5));
        });

        let totalAbsenceDays = 0;
        dateMap.forEach(val => {
          totalAbsenceDays += Math.min(val, 1.0);
        });

        const worked = Math.max(businessDaysCount - totalAbsenceDays, 0);
        monthlyWorked.push(worked);
        workedDaysSum += worked;
      }

      // Calculate December balance (solde restant à fin Décembre)
      const balance = emp.cd_employee_balances?.find(b => b.year === y);
      const defaults = emp.contract_type === 'Interne'
        ? CONTRACT_DEFAULT_BALANCES.Interne
        : CONTRACT_DEFAULT_BALANCES.Externe;

      const initialCp = balance ? balance.initial_cp : defaults.initial_cp;
      const initialRtt = balance ? balance.initial_rtt : defaults.initial_rtt;
      const initialExceptional = balance ? balance.initial_exceptional : defaults.initial_exceptional;
      const initial = initialCp + initialRtt + initialExceptional;

      const usedInYear = abs.filter(a => {
        if (a.employee_id !== emp.id) return false;
        if (a.category === 'Formation') return false;
        const absDate = new Date(a.date);
        return absDate.getFullYear() === y;
      }).reduce((sum, a) => {
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
        annualTotal
      };
    });
  });

  // Calculate sum of worked days for all filtered employees (by month and grand total)
  totals = computed(() => {
    const rows = this.employeesAnnualRows();
    const monthlySum = Array(12).fill(0);
    let grandSum = 0;
    let balanceSum = 0;

    rows.forEach(r => {
      for (let m = 0; m < 12; m++) {
        monthlySum[m] += r.monthlyWorked[m];
      }
      grandSum += r.annualTotal;
      balanceSum += r.decemberBalance;
    });

    return {
      monthly: monthlySum,
      grand: grandSum,
      balance: balanceSum
    };
  });

  ngOnInit() {
    this.employeeService.fetchEmployees();
    this.fetchAbsencesForYear();
  }

  async fetchAbsencesForYear() {
    await this.absenceService.fetchAbsencesForYear(this.year());
  }

  prevYear() {
    this.year.update(y => y - 1);
    this.fetchAbsencesForYear();
  }

  nextYear() {
    this.year.update(y => y + 1);
    this.fetchAbsencesForYear();
  }

  handleFilterChange(newFilters: FilterState) {
    this.activeFilters.set(newFilters);
  }
}
