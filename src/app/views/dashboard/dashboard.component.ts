import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  LucideAngularModule, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  UserCheck, 
  TrendingUp,
  AlertCircle,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-angular';
import { EmployeeService } from '../../services/employee.service';
import { AbsenceService } from '../../services/absence.service';
import { FiltersComponent, FilterState } from '../../shared/filters/filters.component';
import { storageSignal } from '../../../utils/storage-signal';
import { Employee } from '../../models/types';

interface MonthHeadcount {
  monthIndex: number; // 0-11
  monthName: string;
  monthStartStr: string; // YYYY-MM-DD
  monthEndStr: string; // YYYY-MM-DD
  presentCount: number;
  activeEmployees: Employee[];
  arrivals: Employee[];
  departures: Employee[];
}

function parseDateOnly(dateStr: any): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  
  const cleanStr = String(dateStr).split('T')[0];
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d);
    }
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, FiltersComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  // Services
  protected readonly employeeService = inject(EmployeeService);
  protected readonly absenceService = inject(AbsenceService);

  // Expose Icons
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;
  readonly Users = Users;
  readonly UserCheck = UserCheck;
  readonly TrendingUp = TrendingUp;
  readonly AlertCircle = AlertCircle;
  readonly CalendarDays = CalendarDays;
  readonly ArrowUpRight = ArrowUpRight;
  readonly ArrowDownRight = ArrowDownRight;
  readonly X = X;
  readonly ChevronDown = ChevronDown;
  readonly ChevronUp = ChevronUp;

  // Breakdown visibility toggle
  showBreakdown = signal<boolean>(true);

  toggleBreakdown() {
    this.showBreakdown.set(!this.showBreakdown());
  }

  // Calendar State (Annual View)
  currentYear = signal<number>(new Date().getFullYear());
  months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  // Filter State (persisted per view)
  activeFilters = storageSignal<FilterState>('crewdayz_dashboard_view_filters', {
    search: '',
    service: [],
    team: [],
    work_site: [],
    contract_type: []
  });

  // Hovered Chart Month Index
  hoveredIndex = signal<number | null>(null);

  // Unique options for filters
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
      if (filters.service && filters.service.length > 0 && !filters.service.includes(emp.service)) return false;
      if (filters.team && filters.team.length > 0 && !filters.team.includes(emp.team)) return false;
      if (filters.work_site && filters.work_site.length > 0 && !filters.work_site.includes(emp.work_site)) return false;
      if (filters.contract_type && filters.contract_type.length > 0 && !filters.contract_type.includes(emp.contract_type)) return false;
      return true;
    });
  });

  // Compute monthly headcount data for the selected year
  monthlyData = computed<MonthHeadcount[]>(() => {
    const year = this.currentYear();
    const employees = this.filteredEmployees();
    const list: MonthHeadcount[] = [];

    for (let m = 0; m < 12; m++) {
      const lastDay = new Date(year, m + 1, 0).getDate();
      const mm = String(m + 1).padStart(2, '0');
      const monthStartStr = `${year}-${mm}-01`;
      const monthEndStr = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`;

      const startOfMonth = new Date(year, m, 1);
      const endOfMonth = new Date(year, m, lastDay);

      const activeEmployees: Employee[] = [];
      const arrivals: Employee[] = [];
      const departures: Employee[] = [];

      employees.forEach(emp => {
        const arrivalDateObj = parseDateOnly(emp.arrival_date);
        const departureDateObj = parseDateOnly(emp.departure_date);

        // Check active overlap
        const isAfterArrival = !arrivalDateObj || arrivalDateObj <= endOfMonth;
        const isBeforeDeparture = !departureDateObj || departureDateObj >= startOfMonth;

        if (isAfterArrival && isBeforeDeparture) {
          activeEmployees.push(emp);
        }

        // Check arrival in this month
        if (arrivalDateObj && arrivalDateObj >= startOfMonth && arrivalDateObj <= endOfMonth) {
          arrivals.push(emp);
        }

        // Check departure in this month
        if (departureDateObj && departureDateObj >= startOfMonth && departureDateObj <= endOfMonth) {
          departures.push(emp);
        }
      });

      list.push({
        monthIndex: m,
        monthName: this.months[m],
        monthStartStr,
        monthEndStr,
        presentCount: activeEmployees.length,
        activeEmployees,
        arrivals,
        departures
      });
    }

    return list;
  });

  // Compute Key KPI Statistics for the dashboard
  kpis = computed(() => {
    const data = this.monthlyData();
    const year = this.currentYear();
    const employees = this.filteredEmployees();

    // Total unique employees present at some point during the year
    const uniqueYearlyEmployees = employees.filter(emp => {
      const arrivalDateObj = parseDateOnly(emp.arrival_date);
      const departureDateObj = parseDateOnly(emp.departure_date);
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31);

      const isAfterArrival = !arrivalDateObj || arrivalDateObj <= yearEnd;
      const isBeforeDeparture = !departureDateObj || departureDateObj >= yearStart;
      return isAfterArrival && isBeforeDeparture;
    });

    let maxPresence = 0;
    let minPresence = uniqueYearlyEmployees.length;
    let sumPresence = 0;

    data.forEach(d => {
      sumPresence += d.presentCount;
      if (d.presentCount > maxPresence) maxPresence = d.presentCount;
      if (d.presentCount < minPresence) minPresence = d.presentCount;
    });

    const avgPresence = sumPresence / 12;

    // Total arrivals and departures over the year
    let totalArrivals = 0;
    let totalDepartures = 0;
    data.forEach(d => {
      totalArrivals += d.arrivals.length;
      totalDepartures += d.departures.length;
    });

    return {
      totalUniqueEmployees: uniqueYearlyEmployees.length,
      avgPresence: parseFloat(avgPresence.toFixed(1)),
      maxPresence,
      minPresence: uniqueYearlyEmployees.length === 0 ? 0 : minPresence,
      totalArrivals,
      totalDepartures
    };
  });

  // SVG Chart Dimensions & Computations
  chartWidth = 800;
  chartHeight = 140;
  paddingTop = 15;
  paddingBottom = 25;
  paddingLeft = 30;
  paddingRight = 15;

  // X Coordinate for a month index (0-11)
  getX(index: number): number {
    const contentWidth = this.chartWidth - this.paddingLeft - this.paddingRight;
    const step = contentWidth / 11;
    return this.paddingLeft + index * step;
  }

  // Y Coordinate for a headcount count
  getY(count: number, maxCount: number): number {
    const contentHeight = this.chartHeight - this.paddingTop - this.paddingBottom;
    const maxVal = maxCount > 0 ? maxCount : 10;
    const ratio = count / maxVal;
    return this.chartHeight - this.paddingBottom - ratio * contentHeight;
  }

  // Maximum value for Y Axis (Max active + 1)
  chartMaxY = computed(() => {
    const maxP = this.kpis().maxPresence;
    return maxP > 0 ? maxP + 1 : 5;
  });

  // Generate SVG path for the area/line chart
  chartPath = computed(() => {
    const data = this.monthlyData();
    const maxVal = this.chartMaxY();

    if (this.kpis().maxPresence === 0) return { line: '', area: '' };

    let linePoints = '';
    let areaPoints = '';

    const x0 = this.getX(0);
    const y0 = this.getY(data[0].presentCount, maxVal);
    linePoints = `M ${x0} ${y0}`;
    areaPoints = `M ${x0} ${this.chartHeight - this.paddingBottom} L ${x0} ${y0}`;

    for (let i = 1; i < 12; i++) {
      const x = this.getX(i);
      const y = this.getY(data[i].presentCount, maxVal);
      linePoints += ` L ${x} ${y}`;
      areaPoints += ` L ${x} ${y}`;
    }

    const xLast = this.getX(11);
    areaPoints += ` L ${xLast} ${this.chartHeight - this.paddingBottom} Z`;

    return {
      line: linePoints,
      area: areaPoints
    };
  });

  // Y Axis Tick Marks
  yTicks = computed(() => {
    const maxVal = this.chartMaxY();
    if (maxVal <= 5) return Array.from({ length: maxVal + 1 }, (_, i) => i);
    if (maxVal <= 12) {
      const ticks = [];
      for (let i = 0; i <= maxVal; i += 2) ticks.push(i);
      if (ticks[ticks.length - 1] !== maxVal) ticks.push(maxVal);
      return ticks;
    }
    const step = maxVal > 30 ? 10 : 5;
    const ticks = [];
    for (let i = 0; i <= maxVal; i += step) ticks.push(i);
    if (ticks[ticks.length - 1] !== maxVal) ticks.push(maxVal);
    return ticks;
  });

  ngOnInit() {
    this.employeeService.fetchEmployees();
  }

  // Year navigation
  prevYear() {
    this.currentYear.update(y => y - 1);
  }

  nextYear() {
    this.currentYear.update(y => y + 1);
  }

  handleFilterChange(newFilters: FilterState) {
    this.activeFilters.set(newFilters);
  }



  setHoveredIndex(index: number | null) {
    this.hoveredIndex.set(index);
  }
}
