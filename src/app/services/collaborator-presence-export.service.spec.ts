import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { CollaboratorPresenceExportService } from './collaborator-presence-export.service';
import { Employee, Absence } from '../models/types';
import { Injector } from '@angular/core';
import { AbsenceService } from './absence.service';
import { ToastService } from './toast.service';

describe('CollaboratorPresenceExportService', () => {
  const mockEmployee: Employee = {
    id: 'emp-123',
    first_name: 'Jean',
    last_name: 'Dupont',
    service: 'IT',
    team: 'Frontend',
    work_site: 'Paris',
    contract_type: 'Interne',
    profile: 'Lead Dev',
  };

  const injector = Injector.create({
    providers: [
      CollaboratorPresenceExportService,
      {
        provide: AbsenceService,
        useValue: {
          absences: () => [],
          fetchAbsencesForYear: async () => [],
        },
      },
      {
        provide: ToastService,
        useValue: {
          success: () => {},
          error: () => {},
        },
      },
    ],
  });

  const service = injector.get(CollaboratorPresenceExportService);

  it('should compute monthly summary with correct working days and weekends', () => {
    // January 2026: 31 days. Jan 1 is New Year (Holiday).
    const absences: Absence[] = [];
    const summary = service.computeMonthlySummary(mockEmployee, 2026, 0, absences);

    expect(summary.month).toBe(0);
    expect(summary.year).toBe(2026);
    expect(summary.totalCalendarDays).toBe(31);
    expect(summary.totalAbsenceDays).toBe(0);
    expect(summary.totalWorkedDays).toBe(summary.totalWorkingDays);
    expect(summary.dailyRows.length).toBe(31);

    // Jan 1: Jour de l'An
    const jan1 = summary.dailyRows[0];
    expect(jan1.isHoliday).toBe(true);
    expect(jan1.holidayName).toBe("Jour de l'An");
    expect(jan1.isWorkingDay).toBe(false);
    expect(jan1.workedDays).toBe(0);

    // Jan 2: Vendredi ouvré
    const jan2 = summary.dailyRows[1];
    expect(jan2.isHoliday).toBe(false);
    expect(jan2.isWeekend).toBe(false);
    expect(jan2.isWorkingDay).toBe(true);
    expect(jan2.workedDays).toBe(1.0);
  });

  it('should compute absences correctly (full day, half days, categories)', () => {
    const absences: Absence[] = [
      {
        id: 'abs-1',
        employee_id: 'emp-123',
        date: '2026-01-05', // Lundi
        period: 'full',
        category: 'CP',
        comment: 'Vacances ski',
      },
      {
        id: 'abs-2',
        employee_id: 'emp-123',
        date: '2026-01-06', // Mardi
        period: 'morning',
        category: 'RTT',
        comment: 'Rdv médical matin',
      },
      {
        id: 'abs-3',
        employee_id: 'emp-123',
        date: '2026-01-07', // Mercredi
        period: 'afternoon',
        category: 'Formation',
        comment: 'Workshop',
      },
    ];

    const summary = service.computeMonthlySummary(mockEmployee, 2026, 0, absences);

    expect(summary.totalAbsenceDays).toBe(2.0); // 1.0 (CP) + 0.5 (RTT) + 0.5 (Formation)
    expect(summary.absencesByCategory['CP']).toBe(1.0);
    expect(summary.absencesByCategory['RTT']).toBe(0.5);
    expect(summary.absencesByCategory['Formation']).toBe(0.5);

    // Check row for Jan 5 (Full CP)
    const jan5 = summary.dailyRows.find((r) => r.dateStr === '2026-01-05')!;
    expect(jan5.workedDays).toBe(0);
    expect(jan5.absenceDays).toBe(1.0);
    expect(jan5.category).toBe('CP');
    expect(jan5.comment).toBe('Vacances ski');

    // Check row for Jan 6 (Morning RTT)
    const jan6 = summary.dailyRows.find((r) => r.dateStr === '2026-01-06')!;
    expect(jan6.workedDays).toBe(0.5);
    expect(jan6.absenceDays).toBe(0.5);
    expect(jan6.category).toBe('RTT');

    // Check row for Jan 7 (Afternoon Formation)
    const jan7 = summary.dailyRows.find((r) => r.dateStr === '2026-01-07')!;
    expect(jan7.workedDays).toBe(0.5);
    expect(jan7.absenceDays).toBe(0.5);
    expect(jan7.category).toBe('Formation');
  });
});
