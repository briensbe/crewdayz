import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { Injector } from '@angular/core';
import { AnnualPresenceExportService, FRENCH_MONTHS_NAMES } from './annual-presence-export.service';
import { AbsenceService } from './absence.service';
import { ToastService } from './toast.service';
import { Employee, Absence } from '../models/types';
import { worksheetTo2DArray } from '../shared/utils/excel.utils';

describe('AnnualPresenceExportService', () => {
  const mockEmployee1: Employee = {
    id: 'emp-1',
    first_name: 'Alice',
    last_name: 'Martin',
    service: 'IT',
    team: 'Frontend',
    work_site: 'Paris',
    contract_type: 'Interne',
    profile: 'Dev',
  };

  const mockEmployee2: Employee = {
    id: 'emp-2',
    first_name: 'Bob',
    last_name: 'Bernard',
    service: 'RH',
    team: 'Paie',
    work_site: 'Lyon',
    contract_type: 'Externe',
    profile: 'Gestionnaire',
  };

  const mockToast = {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  };

  const mockAbsences: Absence[] = [
    {
      id: 'abs-1',
      employee_id: 'emp-1',
      date: '2026-01-05', // Lundi ouvré
      period: 'full',
      category: 'CP',
    },
    {
      id: 'abs-2',
      employee_id: 'emp-1',
      date: '2026-01-06', // Mardi ouvré
      period: 'morning',
      category: 'RTT',
    },
  ];

  const injector = Injector.create({
    providers: [
      AnnualPresenceExportService,
      {
        provide: AbsenceService,
        useValue: {
          absences: () => mockAbsences,
          fetchAbsencesForYear: async () => mockAbsences,
        },
      },
      {
        provide: ToastService,
        useValue: mockToast,
      },
    ],
  });

  const service = injector.get(AnnualPresenceExportService);

  it('should build absences map correctly', () => {
    const map = service.buildAbsencesMap(mockAbsences);
    expect(map.has('emp-1')).toBe(true);
    expect(map.get('emp-1')?.has('2026-01-05')).toBe(true);
    expect(map.get('emp-1')?.get('2026-01-05')?.length).toBe(1);
    expect(map.get('emp-1')?.get('2026-01-05')?.[0].category).toBe('CP');
  });

  it('should generate annual summary sheet with correct columns and total row', () => {
    const absMap = service.buildAbsencesMap(mockAbsences);
    const ws = service.buildAnnualSummarySheet([mockEmployee1, mockEmployee2], absMap, 2026);

    const sheetJson = worksheetTo2DArray(ws);
    expect(sheetJson.length).toBe(4); // Header + 2 employees + Total row

    // Check header
    expect(sheetJson[0][0]).toBe('Collaborateur');
    expect(sheetJson[0][5]).toBe('Janvier');
    expect(sheetJson[0][16]).toBe('Décembre');
    expect(sheetJson[0][17]).toBe('Solde Déc.');
    expect(sheetJson[0][18]).toBe('Total Annuel');

    // Check Total Row
    const totalRow = sheetJson[3];
    expect(totalRow[0]).toBe('TOTAL CUMULÉ');
  });

  it('should generate monthly detailed matrix with empty cells for worked days and numeric values for absences', () => {
    const absMap = service.buildAbsencesMap(mockAbsences);
    // January 2026 (month 0)
    const ws = service.buildDetailedMonthSheet([mockEmployee1], absMap, 2026, 0);

    const sheetJson = worksheetTo2DArray(ws);

    // Row 0 is header: Collaborateur, Service, Équipe, Site, Type, [1..31], Jours ouvrés, Travaillés, Absences
    expect(sheetJson[0][0]).toBe('Collaborateur');
    expect(sheetJson[0][5]).toContain('1'); // Jan 1st
    expect(sheetJson[0][sheetJson[0].length - 3]).toBe('Jours ouvrés');
    expect(sheetJson[0][sheetJson[0].length - 2]).toBe('Jours travaillés');
    expect(sheetJson[0][sheetJson[0].length - 1]).toBe('Total absences');

    // Row 1 is mockEmployee1
    const empRow = sheetJson[1];
    expect(empRow[0]).toBe('MARTIN Alice');

    // Jan 1 2026 is Holiday (Jour de l'An) -> empty string
    expect(empRow[5]).toBe('');

    // Jan 2 2026 is Friday (regular worked day) -> empty string as per requirement!
    expect(empRow[6]).toBe('');

    // Jan 3 (Sat) and Jan 4 (Sun) are weekend -> empty string
    expect(empRow[7]).toBe('');
    expect(empRow[8]).toBe('');

    // Jan 5 2026 (Monday) has full CP -> value is 1
    expect(empRow[9]).toBe(1);

    // Jan 6 2026 (Tuesday) has morning RTT -> value is 0.5
    expect(empRow[10]).toBe(0.5);

    // Summary totals for emp-1: total absence = 1.5
    const totalAbsCol = empRow[empRow.length - 1];
    expect(totalAbsCol).toBe(1.5);

    // Bottom row is TOTAL DU MOIS
    const totalRow = sheetJson[sheetJson.length - 1];
    expect(totalRow[0]).toBe('TOTAL DU MOIS');
  });

  it('should format cell styles with pastels on absences and grey on weekends', () => {
    const absMap = service.buildAbsencesMap(mockAbsences);
    const ws = service.buildDetailedMonthSheet([mockEmployee1], absMap, 2026, 0);

    // Jan 3 2026 is Saturday -> column index 5 + 3 = 8 -> col letter 'H', row 2 -> H2
    const weekendCell = ws.getCell('H2');
    expect(weekendCell).toBeDefined();
    expect(weekendCell.fill).toBeDefined();
    expect((weekendCell.fill as any)?.fgColor?.argb).toBe('FFF1F5F9');

    // Jan 5 2026 is CP -> col letter 'J', row 2 -> J2
    const cpCell = ws.getCell('J2');
    expect(cpCell).toBeDefined();
    expect(cpCell.fill).toBeDefined();
    expect((cpCell.fill as any)?.fgColor?.argb).toBe('FFF3E8FF'); // Soft purple

    // Jan 6 2026 is RTT -> col letter 'K', row 2 -> K2
    const rttCell = ws.getCell('K2');
    expect(rttCell).toBeDefined();
    expect(rttCell.fill).toBeDefined();
    expect((rttCell.fill as any)?.fgColor?.argb).toBe('FFFEF3C7'); // Soft amber
  });
});
