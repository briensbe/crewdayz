import { Component, input, output, signal, effect, inject, HostListener, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Calendar, X, Trash2, MessageSquare, Info, Plus, Minus } from 'lucide-angular';
import { Employee, Absence, CONTRACT_DEFAULT_BALANCES } from '../../models/types';
import { EmployeeService } from '../../services/employee.service';
import { AbsenceService } from '../../services/absence.service';
import { isFrenchPublicHoliday } from '../../../utils/holidays';

export interface AbsenceSavePayload {
  employee_id: string;
  startDate: string;
  endDate: string;
  startPeriod: 'morning' | 'afternoon';
  endPeriod: 'morning' | 'afternoon';
  category: 'CP' | 'RTT' | 'Maladie' | 'Congé maternité' | 'Exceptionnel' | 'Formation' | 'Autre' | 'Temps partiel' | 'Prévisionnel';
  comment: string;
}

@Component({
  selector: 'app-absence-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './absence-modal.component.html',
  styleUrl: './absence-modal.component.css'
})
export class AbsenceModalComponent {
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      this.onSubmit();
    } else if (event.key === 'Escape' || event.key === 'Esc') {
      event.preventDefault();
      this.onClose();
    }
  }
  // Inputs from parent component
  employeeId = input<string>('');
  initialDate = input<string>(''); // YYYY-MM-DD
  initialEndDate = input<string>(''); // YYYY-MM-DD
  existingAbsence = input<Absence | null>(null);

  // Outputs
  close = output<void>();
  save = output<AbsenceSavePayload>();
  delete = output<{ employeeId: string; dates: { date: string; period: 'full' | 'morning' | 'afternoon' }[] }>();

  // Services
  private readonly employeeService = inject(EmployeeService);
  private readonly absenceService = inject(AbsenceService);

  existingAbsencesInPeriod = computed(() => {
    const empId = this.employeeId();
    const start = this.startDate();
    const end = this.endDate();
    if (!empId || !start || !end) return [];

    // Filter absences for this employee in the date range [start, end]
    const list = this.absenceService.absences().filter(a =>
      a.employee_id === empId && a.date >= start && a.date <= end
    );

    // Sort by date chronologically
    list.sort((a, b) => a.date.localeCompare(b.date));

    // Group consecutive dates of the same category
    interface AbsenceGroup {
      startDate: string;
      endDate: string;
      category: string;
      periods: Set<'full' | 'morning' | 'afternoon'>;
      comments: string[];
    }

    const groups: AbsenceGroup[] = [];

    for (const abs of list) {
      if (groups.length === 0) {
        groups.push({
          startDate: abs.date,
          endDate: abs.date,
          category: abs.category,
          periods: new Set([abs.period]),
          comments: abs.comment ? [abs.comment] : []
        });
        continue;
      }

      const lastGroup = groups[groups.length - 1];

      // Calculate days difference
      const lastDate = new Date(lastGroup.endDate);
      const nextDate = new Date(abs.date);
      const diffTime = Math.abs(nextDate.getTime() - lastDate.getTime());
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      // Merge if consecutive days and same category
      if (diffDays <= 1 && abs.category === lastGroup.category) {
        lastGroup.endDate = abs.date;
        lastGroup.periods.add(abs.period);
        if (abs.comment && !lastGroup.comments.includes(abs.comment)) {
          lastGroup.comments.push(abs.comment);
        }
      } else {
        groups.push({
          startDate: abs.date,
          endDate: abs.date,
          category: abs.category,
          periods: new Set([abs.period]),
          comments: abs.comment ? [abs.comment] : []
        });
      }
    }

    // Format groups for template display
    return groups.map(g => {
      const startFormatted = this.formatDisplayDate(g.startDate);
      const endFormatted = this.formatDisplayDate(g.endDate);

      let dateText = '';
      if (g.startDate === g.endDate) {
        let periodSuffix = '';
        if (g.periods.has('morning') && !g.periods.has('afternoon') && !g.periods.has('full')) {
          periodSuffix = ' (Matin)';
        } else if (g.periods.has('afternoon') && !g.periods.has('morning') && !g.periods.has('full')) {
          periodSuffix = ' (Après-midi)';
        }
        dateText = `Le ${startFormatted}${periodSuffix}`;
      } else {
        dateText = `Du ${startFormatted} au ${endFormatted}`;
      }

      const categoryLabel = this.getCategoryLabel(g.category);
      const commentText = g.comments.length > 0 ? ` : ${g.comments.join(', ')}` : '';

      return {
        category: g.category,
        dateText,
        categoryLabel,
        commentText,
        class: this.getCategoryClass(g.category)
      };
    });
  });

  formatDisplayDate(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
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

  getCategoryClass(category: string): string {
    switch (category) {
      case 'CP': return 'badge-cp';
      case 'RTT': return 'badge-rtt';
      case 'Maladie': return 'badge-maladie';
      case 'Congé maternité': return 'badge-maternite';
      case 'Exceptionnel': return 'badge-exceptionnel';
      case 'Formation': return 'badge-formation';
      case 'Temps partiel': return 'badge-partiel';
      case 'Prévisionnel': return 'badge-previsionnel';
      default: return 'badge-other';
    }
  }

  // Reactive variables for form state
  employeeName = signal<string>('');
  startDate = signal('');
  endDate = signal('');
  startPeriod = signal<'morning' | 'afternoon'>('morning');
  endPeriod = signal<'morning' | 'afternoon'>('afternoon');
  category = signal<'CP' | 'RTT' | 'Maladie' | 'Congé maternité' | 'Exceptionnel' | 'Formation' | 'Autre' | 'Temps partiel' | 'Prévisionnel'>('CP');
  comment = signal('');
  showCommentInput = signal(false);
  errorMessage = signal<string | null>(null);
  showConfirmDelete = signal(false);

  // Compute duration of current selection
  currentAbsenceDays = computed(() => {
    const startStr = this.startDate();
    const endStr = this.endDate();
    if (!startStr || !endStr) return 0;

    const start = new Date(startStr);
    const end = new Date(endStr);
    if (end < start) return 0;

    let total = 0;
    const temp = new Date(start);

    while (temp <= end) {
      const y = temp.getFullYear();
      const mm = String(temp.getMonth() + 1).padStart(2, '0');
      const dd = String(temp.getDate()).padStart(2, '0');
      const dateStr = `${y}-${mm}-${dd}`;

      const dayOfWeek = temp.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = isFrenchPublicHoliday(temp);
      const isMultiSelect = startStr !== endStr;

      if (isMultiSelect && (isWeekend || isHoliday)) {
        temp.setDate(temp.getDate() + 1);
        continue;
      }

      let period: 'full' | 'morning' | 'afternoon' = 'full';
      if (startStr === endStr) {
        if (this.startPeriod() === 'morning' && this.endPeriod() === 'morning') {
          period = 'morning';
        } else if (this.startPeriod() === 'afternoon' && this.endPeriod() === 'afternoon') {
          period = 'afternoon';
        } else {
          period = 'full';
        }
      } else if (dateStr === startStr) {
        period = this.startPeriod() === 'afternoon' ? 'afternoon' : 'full';
      } else if (dateStr === endStr) {
        period = this.endPeriod() === 'morning' ? 'morning' : 'full';
      }

      total += (period === 'full' ? 1.0 : 0.5);
      temp.setDate(temp.getDate() + 1);
    }

    return total;
  });

  // Compute starting and ending balances for CP, RTT, and Exceptional
  balances = computed(() => {
    const empId = this.employeeId();
    const startStr = this.startDate();
    const endStr = this.endDate();
    const selectedCategory = this.category();
    const currentDays = this.currentAbsenceDays();

    if (!empId || !startStr) {
      return null;
    }

    const year = new Date(startStr).getFullYear();
    const emp = this.employeeService.employees().find(e => e.id === empId);
    if (!emp) return null;

    const balanceRecord = emp.cd_employee_balances?.find(b => b.year === year);
    const defaults = emp.contract_type === 'Interne'
      ? CONTRACT_DEFAULT_BALANCES.Interne
      : CONTRACT_DEFAULT_BALANCES.Externe;

    const initialCp = balanceRecord ? balanceRecord.initial_cp : defaults.initial_cp;
    const initialRtt = balanceRecord ? balanceRecord.initial_rtt : defaults.initial_rtt;
    const initialExceptional = balanceRecord ? balanceRecord.initial_exceptional : defaults.initial_exceptional;

    const allAbsences = this.absenceService.absences().filter(a => a.employee_id === empId);

    const usedCp = allAbsences
      .filter(a => a.category === 'CP' && new Date(a.date).getFullYear() === year && (a.date < startStr || a.date > endStr))
      .reduce((sum, a) => sum + (a.period === 'full' ? 1.0 : 0.5), 0);

    const usedRtt = allAbsences
      .filter(a => a.category === 'RTT' && new Date(a.date).getFullYear() === year && (a.date < startStr || a.date > endStr))
      .reduce((sum, a) => sum + (a.period === 'full' ? 1.0 : 0.5), 0);

    const usedExceptional = allAbsences
      .filter(a => a.category === 'Exceptionnel' && new Date(a.date).getFullYear() === year && (a.date < startStr || a.date > endStr))
      .reduce((sum, a) => sum + (a.period === 'full' ? 1.0 : 0.5), 0);

    const startCp = initialCp - usedCp;
    const startRtt = initialRtt - usedRtt;
    const startExceptional = initialExceptional - usedExceptional;

    let endCp = startCp;
    let endRtt = startRtt;
    let endExceptional = startExceptional;

    if (selectedCategory === 'CP') {
      endCp = startCp - currentDays;
    } else if (selectedCategory === 'RTT') {
      endRtt = startRtt - currentDays;
    } else if (selectedCategory === 'Exceptionnel') {
      endExceptional = startExceptional - currentDays;
    }

    // Global balance: CP + RTT + Exceptional minus all absences except Formation
    const initialTotal = initialCp + initialRtt + initialExceptional;
    const usedTotal = allAbsences
      .filter(a => a.category !== 'Formation' && new Date(a.date).getFullYear() === year && (a.date < startStr || a.date > endStr))
      .reduce((sum, a) => sum + (a.period === 'full' ? 1.0 : 0.5), 0);

    const startTotal = initialTotal - usedTotal;
    const endTotal = (selectedCategory !== 'Formation') ? (startTotal - currentDays) : startTotal;

    return {
      cp: { start: startCp, end: endCp },
      rtt: { start: startRtt, end: endRtt },
      exceptional: { start: startExceptional, end: endExceptional },
      total: { start: startTotal, end: endTotal },
      category: selectedCategory,
      duration: currentDays
    };
  });

  // Expose icons
  readonly CalendarIcon = Calendar;
  readonly XIcon = X;
  readonly TrashIcon = Trash2;
  readonly MessageIcon = MessageSquare;
  readonly InfoIcon = Info;
  readonly PlusIcon = Plus;
  readonly MinusIcon = Minus;

  toggleCommentInput() {
    this.showCommentInput.set(!this.showCommentInput());
  }

  constructor() {
    // Watch inputs and fill form
    effect(() => {
      const empId = this.employeeId();
      if (empId) {
        const emp = this.employeeService.employees().find(e => e.id === empId);
        if (emp) {
          this.employeeName.set(`${emp.first_name} ${emp.last_name}`);
        }
      }
    });

    effect(() => {
      const initDate = this.initialDate();
      const initEndDate = this.initialEndDate();
      const exist = this.existingAbsence();

      if (exist) {
        // Edit mode (single day)
        this.startDate.set(exist.date);
        this.endDate.set(exist.date);
        this.category.set(exist.category);
        this.comment.set(exist.comment || '');
        this.showCommentInput.set(!!exist.comment);
        if (exist.period === 'morning') {
          this.startPeriod.set('morning');
          this.endPeriod.set('morning');
        } else if (exist.period === 'afternoon') {
          this.startPeriod.set('afternoon');
          this.endPeriod.set('afternoon');
        } else {
          this.startPeriod.set('morning');
          this.endPeriod.set('afternoon');
        }
      } else if (initDate) {
        // New absence mode (preset start/end dates)
        this.startDate.set(initDate);
        this.endDate.set(initEndDate || initDate);
        this.category.set('Autre');
        this.comment.set('');
        this.showCommentInput.set(false);
        this.startPeriod.set('morning');
        this.endPeriod.set('afternoon');
      }
    });
  }

  onSubmit() {
    this.errorMessage.set(null);

    // Basic date validations
    if (!this.startDate() || !this.endDate()) {
      this.errorMessage.set('Veuillez saisir les dates de début et de fin.');
      return;
    }

    const start = new Date(this.startDate());
    const end = new Date(this.endDate());

    if (end < start) {
      this.errorMessage.set('La date de fin doit être égale ou postérieure à la date de début.');
      return;
    }

    if (this.startDate() === this.endDate() && this.startPeriod() === 'afternoon' && this.endPeriod() === 'morning') {
      this.errorMessage.set('Période invalide pour un même jour (après-midi avant matin).');
      return;
    }

    this.save.emit({
      employee_id: this.employeeId(),
      startDate: this.startDate(),
      endDate: this.endDate(),
      startPeriod: this.startPeriod(),
      endPeriod: this.endPeriod(),
      category: this.category(),
      comment: this.comment()
    });
  }

  getExistingAbsencesList() {
    const empId = this.employeeId();
    const start = this.startDate();
    const end = this.endDate();
    if (!empId || !start || !end) return [];

    return this.absenceService.absences().filter(a =>
      a.employee_id === empId && a.date >= start && a.date <= end
    );
  }

  onDelete() {
    this.showConfirmDelete.set(true);
  }

  confirmDelete() {
    this.showConfirmDelete.set(false);
    const empId = this.employeeId();
    if (!empId) return;

    const exist = this.existingAbsence();
    if (exist) {
      this.delete.emit({
        employeeId: empId,
        dates: [{ date: exist.date, period: exist.period }]
      });
    } else {
      const list = this.getExistingAbsencesList().map(a => ({
        date: a.date,
        period: a.period
      }));
      this.delete.emit({
        employeeId: empId,
        dates: list
      });
    }
  }

  cancelDelete() {
    this.showConfirmDelete.set(false);
  }

  onClose() {
    this.close.emit();
  }
}
