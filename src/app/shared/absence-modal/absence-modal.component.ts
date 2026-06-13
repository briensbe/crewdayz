import { Component, input, output, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Calendar, X, Trash2, MessageSquare, Info } from 'lucide-angular';
import { Employee, Absence } from '../../models/types';
import { EmployeeService } from '../../services/employee.service';

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

  // Reactive variables for form state
  employeeName = signal<string>('');
  startDate = signal('');
  endDate = signal('');
  startPeriod = signal<'morning' | 'afternoon'>('morning');
  endPeriod = signal<'morning' | 'afternoon'>('afternoon');
  category = signal<'CP' | 'RTT' | 'Maladie' | 'Congé maternité' | 'Exceptionnel' | 'Formation' | 'Autre'>('CP');
  comment = signal('');
  errorMessage = signal<string | null>(null);

  // Expose icons
  readonly CalendarIcon = Calendar;
  readonly XIcon = X;
  readonly TrashIcon = Trash2;
  readonly MessageIcon = MessageSquare;
  readonly InfoIcon = Info;

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
