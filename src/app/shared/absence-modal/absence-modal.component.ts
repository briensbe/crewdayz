import { Component, input, output, signal, effect, inject, HostListener, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Calendar, X, Trash2, MessageSquare, Info, Plus, Minus } from 'lucide-angular';
import { Employee, Absence } from '../../models/types';
import { EmployeeService } from '../../services/employee.service';
import { AbsenceService } from '../../services/absence.service';

export interface AbsenceSavePayload {
  employee_id: string;
  startDate: string;
  endDate: string;
  startPeriod: 'morning' | 'afternoon';
  endPeriod: 'morning' | 'afternoon';
  category: 'CP' | 'RTT' | 'Maladie' | 'Congé maternité' | 'Exceptionnel' | 'Formation' | 'Autre';
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
  delete = output<{ employeeId: string; date: string; period: 'full' | 'morning' | 'afternoon' }>();

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
      case 'Autre': return 'Autre absence';
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
      default: return 'badge-other';
    }
  }

  // Reactive variables for form state
  employeeName = signal<string>('');
  startDate = signal('');
  endDate = signal('');
  startPeriod = signal<'morning' | 'afternoon'>('morning');
  endPeriod = signal<'morning' | 'afternoon'>('afternoon');
  category = signal<'CP' | 'RTT' | 'Maladie' | 'Congé maternité' | 'Exceptionnel' | 'Formation' | 'Autre'>('CP');
  comment = signal('');
  showCommentInput = signal(false);
  errorMessage = signal<string | null>(null);

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
        this.category.set('CP');
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

  onDelete() {
    const exist = this.existingAbsence();
    if (exist && exist.employee_id) {
      this.delete.emit({
        employeeId: exist.employee_id,
        date: exist.date,
        period: exist.period
      });
    }
  }

  onClose() {
    this.close.emit();
  }
}
