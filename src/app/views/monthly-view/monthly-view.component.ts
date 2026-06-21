import { Component, inject, signal, computed, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ChevronLeft, ChevronRight, MessageSquare, Info, Filter, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-angular';
import { EmployeeService } from '../../services/employee.service';
import { AbsenceService } from '../../services/absence.service';
import { Employee, Absence, CONTRACT_DEFAULT_BALANCES } from '../../models/types';
import { FiltersComponent, FilterState } from '../../shared/filters/filters.component';
import { AbsenceModalComponent, AbsenceSavePayload } from '../../shared/absence-modal/absence-modal.component';
import { storageSignal } from '../../../utils/storage-signal';
import { isFrenchPublicHoliday, getFrenchPublicHolidayName } from '../../../utils/holidays';
import { SchoolHolidayService } from '../../services/school-holiday.service';
import { getTeamStyle } from '../../shared/utils/color-utils';

interface DayColumn {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  dayNum: number;
  dayName: string;
  weekNum: number;
  isWeekend: boolean;
  isHoliday: boolean;
  isWeekEnd: boolean;
  holidayName?: string;
}

const FRENCH_DAYS = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'];

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

@Component({
  selector: 'app-monthly-view',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, FiltersComponent, AbsenceModalComponent],
  templateUrl: './monthly-view.component.html',
  styleUrl: './monthly-view.component.css'
})
export class MonthlyViewComponent implements OnInit {
  // Services
  protected readonly employeeService = inject(EmployeeService);
  protected readonly absenceService = inject(AbsenceService);
  protected readonly holidayService = inject(SchoolHolidayService);
  protected readonly getTeamStyle = getTeamStyle;

  // Expose icons
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;
  readonly MessageSquare = MessageSquare;
  readonly Info = Info;
  readonly Eye = Eye;
  readonly EyeOff = EyeOff;
  readonly ChevronDown = ChevronDown;
  readonly ChevronUp = ChevronUp;

  // Legend State
  showLegend = signal<boolean>(false);

  toggleLegend() {
    this.showLegend.set(!this.showLegend());
  }

  // Column Visibility State
  showColumns = storageSignal<boolean>('crewdayz_monthly_show_columns', true);
  showServiceCol = computed(() => this.showColumns());
  showTeamCol = computed(() => this.showColumns());
  showSiteCol = computed(() => this.showColumns());
  showTypeCol = computed(() => this.showColumns());
  showBalanceStartCol = computed(() => this.showColumns());

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

  balanceStartColLeft = computed(() => {
    let pos = 150;
    if (this.showServiceCol()) pos += 100;
    if (this.showTeamCol()) pos += 80;
    if (this.showSiteCol()) pos += 90;
    if (this.showTypeCol()) pos += 80;
    return `${pos}px`;
  });

  lastVisibleStickyCol = computed(() => {
    if (this.showBalanceStartCol()) return 'balanceStart';
    if (this.showTypeCol()) return 'type';
    if (this.showSiteCol()) return 'site';
    if (this.showTeamCol()) return 'team';
    if (this.showServiceCol()) return 'service';
    return 'name';
  });

  // Calendar State
  currentDate = signal<Date>(new Date());
  months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  
  // Filter State
  activeFilters = storageSignal<FilterState>('crewdayz_monthly_view_filters', {
    search: '',
    service: '',
    team: '',
    work_site: '',
    contract_type: ''
  });

  // Mouse Selection State
  isSelecting = signal(false);
  selectionEmployeeId = signal<string | null>(null);
  selectionStartDayStr = signal<string | null>(null);
  selectionEndDayStr = signal<string | null>(null);
  selectedDays = signal<string[]>([]); // Array of YYYY-MM-DD

  // Modal State
  showModal = signal(false);
  modalEmployeeId = signal('');
  modalInitialDate = signal('');
  modalInitialEndDate = signal('');
  modalExistingAbsence = signal<Absence | null>(null);

  // Extract unique options for filters
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

  // Calculate year and month numbers
  year = computed(() => this.currentDate().getFullYear());
  month = computed(() => this.currentDate().getMonth());

  // Generate days array for the current month
  daysInMonth = computed<DayColumn[]>(() => {
    const y = this.year();
    const m = this.month();
    const daysCount = new Date(y, m + 1, 0).getDate();
    const list: DayColumn[] = [];
    
    for (let d = 1; d <= daysCount; d++) {
      const date = new Date(y, m, d);
      // Format as YYYY-MM-DD locally without timezone shift
      const mm = String(m + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateStr = `${y}-${mm}-${dd}`;
      const dayOfWeek = date.getDay();
      
      list.push({
        date,
        dateStr,
        dayNum: d,
        dayName: FRENCH_DAYS[dayOfWeek],
        weekNum: getISOWeek(date),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isHoliday: isFrenchPublicHoliday(date),
        isWeekEnd: dayOfWeek === 0,
        holidayName: getFrenchPublicHolidayName(date) || undefined
      });
    }
    return list;
  });

  // Calculate weeks in the month for colspan headers
  weeksInMonth = computed<{ weekNum: number; colSpan: number }[]>(() => {
    const days = this.daysInMonth();
    if (days.length === 0) return [];
    
    const weeks: { weekNum: number; colSpan: number }[] = [];
    let currentWeekNum = days[0].weekNum;
    let currentSpan = 0;
    
    for (const day of days) {
      if (day.weekNum === currentWeekNum) {
        currentSpan++;
      } else {
        weeks.push({ weekNum: currentWeekNum, colSpan: currentSpan });
        currentWeekNum = day.weekNum;
        currentSpan = 1;
      }
    }
    if (currentSpan > 0) {
      weeks.push({ weekNum: currentWeekNum, colSpan: currentSpan });
    }
    return weeks;
  });



  // Calculate left sticky columns count for colspan
  leftColsCount = computed(() => {
    let count = 1; // Name is always visible
    if (this.showServiceCol()) count++;
    if (this.showTeamCol()) count++;
    if (this.showSiteCol()) count++;
    if (this.showTypeCol()) count++;
    if (this.showBalanceStartCol()) count++;
    return count;
  });

  // List of filtered employees
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

  // Calculate profile availability grouped by profile and week to prevent duplication of profiles
  profileWeeklyAvailability = computed(() => {
    const days = this.daysInMonth();
    const employees = this.filteredEmployees();
    const absences = this.absenceService.absences();
    const weeksList = this.weeksInMonth();

    // Group days by weekNum
    const daysByWeek = new Map<number, DayColumn[]>();
    for (const day of days) {
      if (!daysByWeek.has(day.weekNum)) {
        daysByWeek.set(day.weekNum, []);
      }
      daysByWeek.get(day.weekNum)!.push(day);
    }

    // Helper to get absence value on a date
    const getAbsenceVal = (emp: Employee, dateStr: string): number => {
      // If the employee is not yet arrived or has departed on this date, we treat it as 1.0 absence (unavailable)
      if (emp.arrival_date && dateStr < emp.arrival_date) {
        return 1.0;
      }
      if (emp.departure_date && dateStr >= emp.departure_date) {
        return 1.0;
      }
      const list = absences.filter(a => a.employee_id === emp.id && a.date === dateStr);
      let total = 0;
      for (const a of list) {
        if (a.category === 'Formation') continue;
        if (a.period === 'full') {
          total += 1.0;
        } else {
          total += 0.5;
        }
      }
      return Math.min(total, 1.0);
    };

    // Get unique profiles alphabetically
    const profiles = Array.from(new Set(employees.map(e => e.profile?.trim() || 'Non défini'))).sort();

    const result = profiles.map(profileName => {
      // For each profile, compute availability for each week
      const weeksData = weeksList.map(w => {
        const weekDays = daysByWeek.get(w.weekNum) || [];
        const workingDays = weekDays.filter(d => !d.isWeekend && !d.isHoliday);

        // Group by percentage
        const pctGroup = new Map<number, string[]>();

        const profileEmployees = employees.filter(e => (e.profile?.trim() || 'Non défini') === profileName);
        for (const emp of profileEmployees) {
          let percentage = 100;
          if (workingDays.length > 0) {
            let totalAbsence = 0;
            for (const day of workingDays) {
              totalAbsence += getAbsenceVal(emp, day.dateStr);
            }
            const worked = workingDays.length - totalAbsence;
            percentage = Math.max(0, Math.min(100, Math.round((worked / workingDays.length) * 100)));
          }

          if (!pctGroup.has(percentage)) {
            pctGroup.set(percentage, []);
          }
          pctGroup.get(percentage)!.push(`${emp.first_name} ${emp.last_name}`);
        }

        const availabilities = Array.from(pctGroup.entries()).map(([percentage, names]) => ({
          percentage,
          count: names.length,
          employeeNames: names.sort()
        })).sort((a, b) => b.percentage - a.percentage);

        return {
          weekNum: w.weekNum,
          availabilities
        };
      });

      return {
        profileName,
        weeks: weeksData
      };
    });

    return result;
  });

  // Calculate the count of active filters
  activeFiltersCount = computed(() => {
    const filters = this.activeFilters();
    let count = 0;
    if (filters.search?.trim()) count++;
    if (filters.service) count++;
    if (filters.team) count++;
    if (filters.work_site) count++;
    if (filters.contract_type) count++;
    return count;
  });

  ngOnInit() {
    this.employeeService.fetchEmployees();
    this.fetchAbsencesForCurrentYear();
  }

  // Fetch absences for current year
  async fetchAbsencesForCurrentYear() {
    await this.absenceService.fetchAbsencesForYear(this.year());
  }

  // Navigate to previous month
  prevMonth() {
    const current = this.currentDate();
    const currentYear = current.getFullYear();
    const newDate = new Date(current.getFullYear(), current.getMonth() - 1, 1);
    this.currentDate.set(newDate);
    
    // If we transition to a different year, reload absences
    if (newDate.getFullYear() !== currentYear) {
      this.fetchAbsencesForCurrentYear();
    }
  }

  // Navigate to next month
  nextMonth() {
    const current = this.currentDate();
    const currentYear = current.getFullYear();
    const newDate = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    this.currentDate.set(newDate);
    
    // If we transition to a different year, reload absences
    if (newDate.getFullYear() !== currentYear) {
      this.fetchAbsencesForCurrentYear();
    }
  }

  handleFilterChange(newFilters: FilterState) {
    this.activeFilters.set(newFilters);
  }

  // Get employee absences in the selected month
  getAbsenceForCell(employeeId: string, dateStr: string): Absence | null {
    const match = this.absenceService.absences().filter(
      a => a.employee_id === employeeId && a.date === dateStr
    );
    // If we have any, return the first one (since constraint ensures uniqueness per period, we just pick the primary or merge)
    return match.length > 0 ? match[0] : null;
  }

  getCategoryLabel(category: string): string {
    switch (category) {
      case 'CP': return 'Congé Payé (CP)';
      case 'RTT': return 'RTT';
      case 'Maladie': return 'Maladie';
      case 'Congé maternité': return 'Congé Maternité / Paternité';
      case 'Exceptionnel': return 'Congé Exceptionnel';
      case 'Formation': return 'Formation';
      case 'Temps partiel': return 'Temps partiel';
      case 'Prévisionnel': return 'Prévisionnel (Simulation)';
      case 'Autre': return 'Absence';
      default: return category;
    }
  }

  // Determine the display value for a cell: 1, 0.5, 0 or empty
  getCellVal(employeeId: string, dateStr: string): { val: string; class: string; comment?: string; absence: Absence; tooltip: string } | null {
    const emp = this.employeeService.employees().find(e => e.id === employeeId);
    if (emp) {
      const isBeforeArrival = emp.arrival_date && dateStr < emp.arrival_date;
      const isAfterDeparture = emp.departure_date && dateStr >= emp.departure_date;
      
      if (isBeforeArrival || isAfterDeparture) {
        const date = new Date(dateStr);
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = isFrenchPublicHoliday(date);
        if (!isWeekend && !isHoliday) {
          const reason = isBeforeArrival 
            ? `Arrivée le ${this.formatDepartureDateForTooltip(emp.arrival_date!)}`
            : `Départ le ${this.formatDepartureDateForTooltip(emp.departure_date!)}`;
          return {
            val: 'I',
            class: 'abs-unavailable',
            tooltip: `Indisponible (${reason})`,
            absence: null as any
          };
        }
      }
    }

    const list = this.absenceService.absences().filter(
      a => a.employee_id === employeeId && a.date === dateStr
    );
    if (list.length === 0) return null;

    // Sum periods
    let totalAbsenceVal = 0;
    let category = list[0].category;
    let comment = list.map(a => a.comment).filter(Boolean).join(' | ');

    list.forEach(a => {
      // Formation counts for 0 in absence
      if (a.category === 'Formation') {
        // Keeps absence value at 0, but registers it as a training event
        return;
      }
      if (a.period === 'full') {
        totalAbsenceVal += 1.0;
      } else {
        totalAbsenceVal += 0.5;
      }
    });

    // Determine category styling
    let catClass = 'abs-other';
    switch (category) {
      case 'CP': catClass = 'abs-cp'; break;
      case 'RTT': catClass = 'abs-rtt'; break;
      case 'Maladie': catClass = 'abs-maladie'; break;
      case 'Congé maternité': catClass = 'abs-maternite'; break;
      case 'Exceptionnel': catClass = 'abs-exceptionnel'; break;
      case 'Formation': catClass = 'abs-formation'; break;
      case 'Temps partiel': catClass = 'abs-partiel'; break;
      case 'Prévisionnel': catClass = 'abs-previsionnel'; break;
    }

    const tooltipParts = list.map(a => {
      let label = this.getCategoryLabel(a.category);
      if (a.period === 'morning') {
        label += ' (Matin)';
      } else if (a.period === 'afternoon') {
        label += ' (Après-midi)';
      } else {
        label += ' (Journée)';
      }
      if (a.comment) {
        label += ` : ${a.comment}`;
      }
      return label;
    });
    const tooltip = tooltipParts.join('\n');

    return {
      val: category === 'Formation' ? 'F' : String(totalAbsenceVal),
      class: catClass,
      comment: comment || undefined,
      absence: list[0],
      tooltip: tooltip
    };
  }

  // Calculate beginning of month balance (Initial - used in active year before this month)
  getBeginningBalance(emp: Employee): number {
    const y = this.year();
    const balance = emp.cd_employee_balances?.find(b => b.year === y);
    const defaults = emp.contract_type === 'Interne'
      ? CONTRACT_DEFAULT_BALANCES.Interne
      : CONTRACT_DEFAULT_BALANCES.Externe;

    const initialCp = balance ? balance.initial_cp : defaults.initial_cp;
    const initialRtt = balance ? balance.initial_rtt : defaults.initial_rtt;
    const initialExceptional = balance ? balance.initial_exceptional : defaults.initial_exceptional;
    const initial = initialCp + initialRtt + initialExceptional;
    const m = this.month();
    
    // Start of current month date limit
    const startOfSelectedMonth = new Date(y, m, 1);

    // Sum all eligible absences before the start of this month (all except Formation)
    const used = this.absenceService.absences().filter(a => {
      if (a.employee_id !== emp.id) return false;
      if (a.category === 'Formation') return false;
      const absDate = new Date(a.date);
      return absDate.getFullYear() === y && absDate < startOfSelectedMonth;
    }).reduce((sum, a) => {
      return sum + (a.period === 'full' ? 1.0 : 0.5);
    }, 0);

    return initial - used;
  }

  // Calculate end of month balance (Beginning balance - used in selected month)
  getEndingBalance(emp: Employee): number {
    const startBalance = this.getBeginningBalance(emp);
    const y = this.year();
    const m = this.month();

    // Sum eligible absences in the selected month (all except Formation)
    const usedInMonth = this.absenceService.absences().filter(a => {
      if (a.employee_id !== emp.id) return false;
      if (a.category === 'Formation') return false;
      const absDate = new Date(a.date);
      return absDate.getFullYear() === y && absDate.getMonth() === m;
    }).reduce((sum, a) => {
      return sum + (a.period === 'full' ? 1.0 : 0.5);
    }, 0);

    return startBalance - usedInMonth;
  }

  // Calculate actual worked days in the month (Mon-Fri business days minus absences)
  getWorkedDays(emp: Employee): number {
    const y = this.year();
    const m = this.month();
    const totalDays = new Date(y, m + 1, 0).getDate();
    let businessDaysCount = 0;

    // Count standard Mon-Fri business days in this month (excluding holidays and days before arrival / after departure)
    for (let d = 1; d <= totalDays; d++) {
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

    // Count absences that reduce working days (i.e. everything except Formation, on business days and not holidays)
    const absencesInMonth = this.absenceService.absences().filter(a => {
      if (a.employee_id !== emp.id) return false;
      if (a.category === 'Formation') return false; // Formation counts as 0 absence (so worked day)
      if (emp.arrival_date && a.date < emp.arrival_date) return false;
      if (emp.departure_date && a.date > emp.departure_date) return false;

      const absDate = new Date(a.date);
      if (absDate.getFullYear() !== y || absDate.getMonth() !== m) return false;
      // Ensure the absence is on a business day and not a public holiday
      const dayOfWeek = absDate.getDay();
      return dayOfWeek !== 0 && dayOfWeek !== 6 && !isFrenchPublicHoliday(absDate);
    });

    // Sum absence values
    let totalAbsenceDays = 0;
    // We group by date to prevent double counting if multiple half days exist on same date
    const dateMap = new Map<string, number>();
    absencesInMonth.forEach(a => {
      const current = dateMap.get(a.date) || 0;
      dateMap.set(a.date, current + (a.period === 'full' ? 1.0 : 0.5));
    });

    dateMap.forEach(val => {
      totalAbsenceDays += Math.min(val, 1.0); // Caps at 1.0 day of absence per calendar date
    });

    const worked = businessDaysCount - totalAbsenceDays;
    return Math.max(worked, 0);
  }

  isEmployeeUnavailable(emp: Employee, dateStr: string): boolean {
    const isBeforeArrival = !!(emp.arrival_date && dateStr < emp.arrival_date);
    const isAfterDeparture = !!(emp.departure_date && dateStr >= emp.departure_date);
    return isBeforeArrival || isAfterDeparture;
  }

  formatDepartureDateForTooltip(dateStr: string): string {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  // ----------------------------------------------------
  // Drag Selection Handlers
  // ----------------------------------------------------
  
  onCellMouseDown(employeeId: string, dateStr: string, event: MouseEvent) {
    if (event.button !== 0) return; // Only left click
    
    this.isSelecting.set(true);
    this.selectionEmployeeId.set(employeeId);
    this.selectionStartDayStr.set(dateStr);
    this.selectionEndDayStr.set(dateStr);
    this.updateSelectedDaysList();
  }

  onCellMouseEnter(employeeId: string, dateStr: string) {
    if (!this.isSelecting() || this.selectionEmployeeId() !== employeeId) return;
    const emp = this.employeeService.employees().find(e => e.id === employeeId);
    if (emp && this.isEmployeeUnavailable(emp, dateStr)) return;
    this.selectionEndDayStr.set(dateStr);
    this.updateSelectedDaysList();
  }

  @HostListener('document:mouseup')
  onMouseUp() {
    if (!this.isSelecting()) return;
    
    const empId = this.selectionEmployeeId();
    const startStr = this.selectionStartDayStr();
    const endStr = this.selectionEndDayStr();

    this.isSelecting.set(false);

    if (empId && startStr && endStr) {
      if (startStr === endStr) {
        // Single cell clicked: if it already has an absence, open edit modal; otherwise, open add modal
        const existing = this.getAbsenceForCell(empId, startStr);
        if (existing) {
          this.openEditAbsenceModal(empId, existing);
        } else {
          this.openAddAbsenceModal(empId, startStr, startStr);
        }
      } else {
        // Multi-cell selection: open add modal for the whole range to overwrite/declare absences
        const start = new Date(startStr);
        const end = new Date(endStr);
        
        const actualStartStr = start < end ? startStr : endStr;
        const actualEndStr = start < end ? endStr : startStr;

        this.openAddAbsenceModal(empId, actualStartStr, actualEndStr);
      }
    }
    
    this.selectionEmployeeId.set(null);
    this.selectionStartDayStr.set(null);
    this.selectionEndDayStr.set(null);
    this.selectedDays.set([]);
  }

  private updateSelectedDaysList() {
    const empId = this.selectionEmployeeId();
    const startStr = this.selectionStartDayStr();
    const endStr = this.selectionEndDayStr();

    if (!empId || !startStr || !endStr) {
      this.selectedDays.set([]);
      return;
    }

    const emp = this.employeeService.employees().find(e => e.id === empId);

    const start = new Date(startStr);
    const end = new Date(endStr);
    const sDate = start < end ? start : end;
    const eDate = start < end ? end : start;

    const list: string[] = [];
    const temp = new Date(sDate);
    while (temp <= eDate) {
      const y = temp.getFullYear();
      const mm = String(temp.getMonth() + 1).padStart(2, '0');
      const dd = String(temp.getDate()).padStart(2, '0');
      const dateStr = `${y}-${mm}-${dd}`;
      
      const dayOfWeek = temp.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = isFrenchPublicHoliday(temp);
      const isUnavailable = !!(emp && (
        (emp.arrival_date && dateStr < emp.arrival_date) ||
        (emp.departure_date && dateStr >= emp.departure_date)
      ));

      if (!isWeekend && !isHoliday && !isUnavailable) {
        list.push(dateStr);
      }
      temp.setDate(temp.getDate() + 1);
    }
    this.selectedDays.set(list);
  }

  isCellSelected(employeeId: string, dateStr: string): boolean {
    return this.isSelecting() && this.selectionEmployeeId() === employeeId && this.selectedDays().includes(dateStr);
  }

  // ----------------------------------------------------
  // Modal Handlers
  // ----------------------------------------------------
  
  openAddAbsenceModal(employeeId: string, startDateStr: string, endDateStr?: string) {
    this.modalEmployeeId.set(employeeId);
    this.modalInitialDate.set(startDateStr);
    this.modalInitialEndDate.set(endDateStr || '');
    this.modalExistingAbsence.set(null);
    this.showModal.set(true);
  }

  openEditAbsenceModal(employeeId: string, absence: Absence) {
    this.modalEmployeeId.set(employeeId);
    this.modalInitialDate.set(absence.date);
    this.modalInitialEndDate.set('');
    this.modalExistingAbsence.set(absence);
    this.showModal.set(true);
  }

  async onModalSave(payload: AbsenceSavePayload) {
    this.showModal.set(false);
    
    // Generate dates between startDate and endDate
    const start = new Date(payload.startDate);
    const end = new Date(payload.endDate);
    
    const absencesToUpsert: Absence[] = [];
    const datesToDelete: string[] = [];
    const temp = new Date(start);

    while (temp <= end) {
      const y = temp.getFullYear();
      const mm = String(temp.getMonth() + 1).padStart(2, '0');
      const dd = String(temp.getDate()).padStart(2, '0');
      const dateStr = `${y}-${mm}-${dd}`;

      const dayOfWeek = temp.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = isFrenchPublicHoliday(temp);
      const isMultiSelect = payload.startDate !== payload.endDate;

      if (isMultiSelect && (isWeekend || isHoliday)) {
        temp.setDate(temp.getDate() + 1);
        continue;
      }

      datesToDelete.push(dateStr);

      // Determine period for this date
      // If single day: use startPeriod and endPeriod
      // If multiple days:
      // - First day: startPeriod to afternoon (e.g. if startPeriod is afternoon, it's 'afternoon', if morning it's 'full')
      // - Last day: morning to endPeriod (e.g. if endPeriod is morning, it's 'morning', if afternoon it's 'full')
      // - Middle days: 'full'
      let period: 'full' | 'morning' | 'afternoon' = 'full';
      
      if (payload.startDate === payload.endDate) {
        if (payload.startPeriod === 'morning' && payload.endPeriod === 'morning') {
          period = 'morning';
        } else if (payload.startPeriod === 'afternoon' && payload.endPeriod === 'afternoon') {
          period = 'afternoon';
        } else {
          period = 'full';
        }
      } else if (dateStr === payload.startDate) {
        period = payload.startPeriod === 'afternoon' ? 'afternoon' : 'full';
      } else if (dateStr === payload.endDate) {
        period = payload.endPeriod === 'morning' ? 'morning' : 'full';
      }

      absencesToUpsert.push({
        employee_id: payload.employee_id,
        date: dateStr,
        period,
        category: payload.category,
        comment: payload.comment || undefined
      });

      temp.setDate(temp.getDate() + 1);
    }

    try {
      await this.absenceService.replaceEmployeeAbsences(
        payload.employee_id,
        datesToDelete,
        absencesToUpsert,
        this.year()
      );
    } catch (err: any) {
      alert("Erreur lors de la sauvegarde de l'absence : " + err.message);
    }
  }

  async onModalDelete(payload: { employeeId: string; dates: { date: string; period: 'full' | 'morning' | 'afternoon' }[] }) {
    this.showModal.set(false);
    try {
      await this.absenceService.deleteEmployeeAbsencesForDates(
        payload.employeeId,
        payload.dates,
        this.year()
      );
    } catch (err: any) {
      alert("Erreur lors de la suppression de l'absence : " + err.message);
    }
  }
}
