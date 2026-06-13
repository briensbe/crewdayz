import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ChevronLeft, ChevronRight, BarChart3, Info } from 'lucide-angular';
import { EmployeeService } from '../../services/employee.service';
import { AbsenceService } from '../../services/absence.service';
import { Employee } from '../../models/types';
import { FiltersComponent, FilterState } from '../../shared/filters/filters.component';

interface EmployeeAnnualRow {
  employee: Employee;
  monthlyWorked: number[];
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
  // Services
  protected readonly employeeService = inject(EmployeeService);
  protected readonly absenceService = inject(AbsenceService);

  // Expose icons
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;
  readonly Info = Info;

  // State
  year = signal<number>(new Date().getFullYear());
  months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jui', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

  // Filter State
  activeFilters = signal<FilterState>({
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
    return this.employeeService.employees().filter(emp => {
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
      let annualTotal = 0;

      for (let m = 0; m < 12; m++) {
        // Calculate total days in month
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        let businessDaysCount = 0;

        // Count Mon-Fri business days
        for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(y, m, d);
          const dayOfWeek = date.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            businessDaysCount++;
          }
        }

        // Count absences that reduce working days (exclude Formation, filter active year/month, ensure business days)
        const absencesInMonth = abs.filter(a => {
          if (a.employee_id !== emp.id) return false;
          if (a.category === 'Formation') return false; // Formation doesn't reduce worked days
          const absDate = new Date(a.date);
          if (absDate.getFullYear() !== y || absDate.getMonth() !== m) return false;
          
          const dayOfWeek = absDate.getDay();
          return dayOfWeek !== 0 && dayOfWeek !== 6;
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
        annualTotal += worked;
      }

      return {
        employee: emp,
        monthlyWorked,
        annualTotal
      };
    });
  });

  // Calculate sum of worked days for all filtered employees (by month and grand total)
  totals = computed(() => {
    const rows = this.employeesAnnualRows();
    const monthlySum = Array(12).fill(0);
    let grandSum = 0;

    rows.forEach(r => {
      for (let m = 0; m < 12; m++) {
        monthlySum[m] += r.monthlyWorked[m];
      }
      grandSum += r.annualTotal;
    });

    return {
      monthly: monthlySum,
      grand: grandSum
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
