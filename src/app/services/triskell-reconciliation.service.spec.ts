import '@angular/compiler';
import { Injector } from '@angular/core';
import { TriskellReconciliationService } from './triskell-reconciliation.service';
import { EmployeeService } from './employee.service';
import { AbsenceService } from './absence.service';
import { ToastService } from './toast.service';
import { Employee, Absence } from '../models/types';
import * as XLSX from 'xlsx-js-style';
import { describe, it, expect } from 'vitest';

describe('TriskellReconciliationService', () => {
  const mockEmployees: Employee[] = [
    {
      id: 'emp-1',
      first_name: 'Adrien',
      last_name: 'MOREL',
      service: 'DSI',
      team: 'Dev',
      work_site: 'Paris',
      contract_type: 'Externe',
      profile: 'Dev',
      company_name: 'MAP TECH',
    },
    {
      id: 'emp-2',
      first_name: 'Florian',
      last_name: 'RAOULBEAU',
      service: 'DSI',
      team: 'Dev',
      work_site: 'Paris',
      contract_type: 'Externe',
      profile: 'Lead Dev',
      company_name: 'TALAN',
    },
    {
      id: 'emp-3',
      first_name: 'Alexandre',
      last_name: 'FREITAS',
      service: 'DSI',
      team: 'Dev',
      work_site: 'Paris',
      contract_type: 'Interne',
      profile: 'Architecte',
    },
  ];

  const injector = Injector.create({
    providers: [
      TriskellReconciliationService,
      {
        provide: EmployeeService,
        useValue: {
          employees: () => mockEmployees,
        },
      },
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

  const service = injector.get(TriskellReconciliationService);

  describe('matchEmployee', () => {
    it('should match exact first_name and last_name', () => {
      const match = service.matchEmployee('Adrien MOREL', mockEmployees);
      expect(match).toBeDefined();
      expect(match?.id).toBe('emp-1');
    });

    it('should match inverted last_name first_name', () => {
      const match = service.matchEmployee('MOREL Adrien', mockEmployees);
      expect(match).toBeDefined();
      expect(match?.id).toBe('emp-1');
    });

    it('should match when string contains additional text like (Fin de mission)', () => {
      const match = service.matchEmployee('Florian RAOULBEAU (Fin de mission)', mockEmployees);
      expect(match).toBeDefined();
      expect(match?.id).toBe('emp-2');
    });

    it('should match with different case and accents', () => {
      const match = service.matchEmployee('florian raoulbeau', mockEmployees);
      expect(match).toBeDefined();
      expect(match?.id).toBe('emp-2');
    });

    it('should return null when employee is not in list', () => {
      const match = service.matchEmployee('Jean DUPONT', mockEmployees);
      expect(match).toBeNull();
    });
  });

  describe('computeCrewdayzWorkedDays', () => {
    it('should compute worked days correctly without absences for a known month', () => {
      // In March 2026: 31 days, 22 business days (no French holiday in March)
      const res = service.computeCrewdayzWorkedDays(mockEmployees[0], 2026, 2, []);
      expect(res.workedDays).toBe(22);
      expect(res.monthAbsences.length).toBe(0);
    });

    it('should deduct absences from worked days', () => {
      const mockAbsences: Absence[] = [
        {
          id: 'abs-1',
          employee_id: 'emp-1',
          date: '2026-03-02', // Monday
          period: 'full',
          category: 'CP',
        },
        {
          id: 'abs-2',
          employee_id: 'emp-1',
          date: '2026-03-03', // Tuesday
          period: 'morning',
          category: 'RTT',
        },
      ];

      const res = service.computeCrewdayzWorkedDays(mockEmployees[0], 2026, 2, mockAbsences);
      // 22 - 1.0 - 0.5 = 20.5
      expect(res.workedDays).toBe(20.5);
      expect(res.monthAbsences.length).toBe(2);
    });
  });

  describe('parseTriskellWorkbook', () => {
    it('should parse a synthetic Excel workbook resembling Triskell export', () => {
      const wb = XLSX.utils.book_new();
      const wsData = [
        ['Statut macro = Exécutée'],
        ['03/09/2026 17:14'],
        ['Calcul du Prévisionnel ESN 2026 de l\'unité SIDI-DÉVELOPPEMENTS DISTRIBUTION'],
        ['', '', '', '', '', 'JANV', '', '', 'FEV', '', '', '', '', '', 'MARS'],
        ['Unité', 'id_ressou', 'Ressource', 'Fournisseur', 'Contrat', 'Capacité', 'Consommé', 'Montant', 'Capacité', 'Consommé', 'TJM', 'Suppl.', 'Montant', 'Capacité', 'Consommé'],
        ['SIDI', '602', 'Adrien MOREL', 'MAP TECH', '2022-18', '19.000', '19.000', '10070', '20.000', '20.000', '530', '', '10600', '21.000', '21.000'],
        ['SIDI', '1508', 'Florian RAOULBEAU (Fin de mission)', 'TALAN', '2025-78-DED', '20.000', '20.000', '11200', '19.500', '19.500', '560', '', '10920', '22.000', '22.000'],
        ['Total général', '', '', '', '', '303.500', '303.500', '214672.50'],
        ['Capacité interne de l\'unité SIDI-DÉVELOPPEMENTS DISTRIBUTION'],
        ['', '', '', '', '', 'JANV', '', '', 'FEV', '', '', '', '', '', 'MARS'],
        ['Unité', 'id_ressou', 'Ressource', 'Fournisseur', 'Contrat', 'Capacité', 'Consommé', 'Montant', 'Capacité', 'Consommé', 'TJM', 'Suppl.', 'Montant', 'Capacité', 'Consommé'],
        ['SIDI', '211', 'Alexandre FREITAS', '(vide)', '(vide)', '4.000', '4.000', '', '7.500', '7.500', '', '', '', '8.500', '8.500'],
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Feuille 1');

      const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const result = service.parseTriskellWorkbook(buffer);

      expect(result.year).toBe(2026);
      expect(result.rawEntries.length).toBe(3);
      expect(result.rawEntries[0].resourceName).toBe('Adrien MOREL');
      expect(result.rawEntries[0].sectionType).toBe('ESN');
      expect(result.rawEntries[0].months[0]).toBe(19); // Janv
      expect(result.rawEntries[0].months[1]).toBe(20); // Fev
      expect(result.rawEntries[0].months[2]).toBe(21); // Mars

      expect(result.rawEntries[2].resourceName).toBe('Alexandre FREITAS');
      expect(result.rawEntries[2].sectionType).toBe('Interne');
      expect(result.rawEntries[2].months[2]).toBe(8.5); // Mars
    });

    it('should parse a tcd_conso sheet format with numeric months', () => {
      const wb = XLSX.utils.book_new();
      const wsData = [
        ['Année', '2026'],
        ['Statut feuille de temps', '(Plusieurs éléments)'],
        [''],
        ['Somme de Temps saisi (jour)', '', '', '', 'Mois'],
        ['Unité', 'id ressource', 'Ressource', 'Fournisseur', '1', '2', '3', 'Total général'],
        ['SIDI-DED', '602', 'Adrien MOREL', 'MAP TECHNOLOGIES', '19,000', '20,000', '21,000', '60,000'],
        ['', '1508', 'Florian RAOULBEAU (Fin de mission)', 'TALAN', '20,000', '19,500', '22,000', '61,500'],
        ['', '211', 'Alexandre FREITAS', '(vide)', '4,000', '7,500', '8,500', '20,000'],
        ['Total général', '', '', '', '43,000', '47,000', '51,500', '141,500'],
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'tcd_conso');

      const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const result = service.parseTriskellWorkbook(buffer);

      expect(result.year).toBe(2026);
      expect(result.rawEntries.length).toBe(3);
      expect(result.rawEntries[0].resourceName).toBe('Adrien MOREL');
      expect(result.rawEntries[0].sectionType).toBe('ESN');
      expect(result.rawEntries[0].months[0]).toBe(19);
      expect(result.rawEntries[0].months[1]).toBe(20);
      expect(result.rawEntries[0].months[2]).toBe(21);

      expect(result.rawEntries[1].resourceName).toBe('Florian RAOULBEAU (Fin de mission)');
      expect(result.rawEntries[1].sectionType).toBe('ESN');
      expect(result.rawEntries[1].months[1]).toBe(19.5);

      expect(result.rawEntries[2].resourceName).toBe('Alexandre FREITAS');
      expect(result.rawEntries[2].sectionType).toBe('Interne');
      expect(result.rawEntries[2].months[0]).toBe(4);
      expect(result.rawEntries[2].months[2]).toBe(8.5);
    });
  });

  describe('buildMonthReconciliation (Consolidation)', () => {
    it('should consolidate multiple Triskell lines matching the same employee into a single row', () => {
      const parseResult = {
        year: 2026,
        availableMonths: [0, 1, 2, 3, 4, 5],
        rawEntries: [
          // ESN line for Adrien MOREL (emp-1)
          {
            unit: 'SIDI-DED',
            resourceId: '1203',
            resourceName: 'Adrien MOREL (MAP TECH)',
            supplier: 'MAP TECH',
            contract: '2025-01',
            sectionType: 'ESN' as const,
            months: { 4: 4.0, 5: 0.0 }, // Mois 5 (Mai): 4j, Mois 6 (Juin): 0j
          },
          // Internal line for Adrien MOREL (emp-1)
          {
            unit: 'SIDI-DED',
            resourceId: '1628',
            resourceName: 'Adrien MOREL',
            supplier: '',
            contract: '',
            sectionType: 'Interne' as const,
            months: { 4: 16.0, 5: 22.0 }, // Mois 5 (Mai): 16j, Mois 6 (Juin): 22j
          },
        ],
        unmatchedNames: [],
      };

      // In May 2026 (index 4): 20 business days (ignoring holidays in pure math or based on service computation)
      const maySummary = service.buildMonthReconciliation(parseResult, 4);

      // Should have only 1 consolidated row instead of 2 separate rows
      expect(maySummary.rows.length).toBe(1);
      const rowMay = maySummary.rows[0];
      expect(rowMay.employee?.id).toBe('emp-1');
      // Sum of 4.0 + 16.0 = 20.0
      expect(rowMay.consumedDays).toBe(20.0);
      expect(rowMay.sourceEntries.length).toBe(2);
      expect(rowMay.sourceEntries[0].resourceId).toBe('1203');
      expect(rowMay.sourceEntries[1].resourceId).toBe('1628');
      // Active line with majority consumption on May is Interne (16.0 > 4.0)
      expect(rowMay.sectionType).toBe('Interne');

      // In June 2026 (index 5): 22 business days
      const juneSummary = service.buildMonthReconciliation(parseResult, 5);
      expect(juneSummary.rows.length).toBe(1);
      const rowJune = juneSummary.rows[0];
      // Sum of 0.0 + 22.0 = 22.0
      expect(rowJune.consumedDays).toBe(22.0);
      expect(rowJune.crewdayzWorkedDays).toBe(22);
      expect(rowJune.difference).toBe(0);
      expect(rowJune.hasAnomaly).toBe(false);
      // Primary section is Interne (22.0 > 0.0)
      expect(rowJune.sectionType).toBe('Interne');
      // Ensure totalCrewdayzWorked is counted only once (22j, not 44j)
      expect(juneSummary.totalCrewdayzWorked).toBe(22);
      expect(juneSummary.matchedCount).toBe(1);
    });
  });
});
