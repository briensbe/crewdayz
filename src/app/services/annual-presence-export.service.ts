import { Injectable, inject } from '@angular/core';
import * as XLSX from 'xlsx-js-style';
import { Employee, Absence, CONTRACT_DEFAULT_BALANCES } from '../models/types';
import { AbsenceService } from './absence.service';
import { ToastService } from './toast.service';
import { isFrenchPublicHoliday, getFrenchPublicHolidayName } from '../../utils/holidays';

export const FRENCH_MONTHS_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export const FRENCH_DAYS_SHORT = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'];

interface EmployeeMonthRowCalculation {
  employee: Employee;
  dayValues: Array<{
    val: number | string;
    isWeekend: boolean;
    isHoliday: boolean;
    isUnavailable: boolean;
    category?: string;
  }>;
  totalWorkingDays: number;
  totalWorkedDays: number;
  totalAbsenceDays: number;
}

interface EmployeeAnnualSummaryRow {
  employee: Employee;
  monthlyWorked: number[];
  decemberBalance: number;
  annualTotal: number;
}

@Injectable({
  providedIn: 'root',
})
export class AnnualPresenceExportService {
  private readonly absenceService = inject(AbsenceService);
  private readonly toastService = inject(ToastService);

  /**
   * Palette de couleurs pastels pour l'export Excel (basée sur le thème clair)
   */
  private readonly styles = {
    header: {
      fill: { fgColor: { rgb: '1E3A8A' } }, // Navy 900
      font: { name: 'Arial', sz: 9, bold: true, color: { rgb: 'FFFFFF' } },
      alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
      border: {
        top: { style: 'thin', color: { rgb: 'CBD5E1' } },
        bottom: { style: 'medium', color: { rgb: '475569' } },
        left: { style: 'thin', color: { rgb: 'CBD5E1' } },
        right: { style: 'thin', color: { rgb: 'CBD5E1' } },
      },
    },
    metaHeader: {
      fill: { fgColor: { rgb: '0F172A' } }, // Slate 900
      font: { name: 'Arial', sz: 9, bold: true, color: { rgb: 'FFFFFF' } },
      alignment: { vertical: 'center', horizontal: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'CBD5E1' } },
        bottom: { style: 'medium', color: { rgb: '475569' } },
        left: { style: 'thin', color: { rgb: 'CBD5E1' } },
        right: { style: 'thin', color: { rgb: 'CBD5E1' } },
      },
    },
    cellRegular: {
      font: { name: 'Arial', sz: 9 },
      alignment: { vertical: 'center', horizontal: 'left' },
      border: {
        top: { style: 'thin', color: { rgb: 'E2E8F0' } },
        bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
        left: { style: 'thin', color: { rgb: 'E2E8F0' } },
        right: { style: 'thin', color: { rgb: 'E2E8F0' } },
      },
    },
    cellNumber: {
      font: { name: 'Arial', sz: 9 },
      alignment: { vertical: 'center', horizontal: 'right' },
      border: {
        top: { style: 'thin', color: { rgb: 'E2E8F0' } },
        bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
        left: { style: 'thin', color: { rgb: 'E2E8F0' } },
        right: { style: 'thin', color: { rgb: 'E2E8F0' } },
      },
    },
    cellDayEmpty: {
      font: { name: 'Arial', sz: 9 },
      alignment: { vertical: 'center', horizontal: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'E2E8F0' } },
        bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
        left: { style: 'thin', color: { rgb: 'E2E8F0' } },
        right: { style: 'thin', color: { rgb: 'E2E8F0' } },
      },
    },
    weekend: {
      fill: { fgColor: { rgb: 'F1F5F9' } }, // Slate 100
      font: { name: 'Arial', sz: 9, color: { rgb: '94A3B8' } },
      alignment: { vertical: 'center', horizontal: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'E2E8F0' } },
        bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
        left: { style: 'thin', color: { rgb: 'E2E8F0' } },
        right: { style: 'thin', color: { rgb: 'E2E8F0' } },
      },
    },
    holiday: {
      fill: { fgColor: { rgb: 'E0F2FE' } }, // Sky 100
      font: { name: 'Arial', sz: 9, bold: true, color: { rgb: '0369A1' } },
      alignment: { vertical: 'center', horizontal: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'BAE6FD' } },
        bottom: { style: 'thin', color: { rgb: 'BAE6FD' } },
        left: { style: 'thin', color: { rgb: 'BAE6FD' } },
        right: { style: 'thin', color: { rgb: 'BAE6FD' } },
      },
    },
    unavailable: {
      fill: { fgColor: { rgb: 'F8FAFC' } },
      font: { name: 'Arial', sz: 9, color: { rgb: '94A3B8' } },
      alignment: { vertical: 'center', horizontal: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'E2E8F0' } },
        bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
        left: { style: 'thin', color: { rgb: 'E2E8F0' } },
        right: { style: 'thin', color: { rgb: 'E2E8F0' } },
      },
    },
    // Pastels for absence categories
    absCp: {
      fill: { fgColor: { rgb: 'F3E8FF' } }, // Soft purple
      font: { name: 'Arial', sz: 9, bold: true, color: { rgb: '6B21A8' } },
      alignment: { vertical: 'center', horizontal: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'E9D5FF' } },
        bottom: { style: 'thin', color: { rgb: 'E9D5FF' } },
        left: { style: 'thin', color: { rgb: 'E9D5FF' } },
        right: { style: 'thin', color: { rgb: 'E9D5FF' } },
      },
    },
    absRtt: {
      fill: { fgColor: { rgb: 'FEF3C7' } }, // Soft amber/orange
      font: { name: 'Arial', sz: 9, bold: true, color: { rgb: 'B45309' } },
      alignment: { vertical: 'center', horizontal: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'FDE68A' } },
        bottom: { style: 'thin', color: { rgb: 'FDE68A' } },
        left: { style: 'thin', color: { rgb: 'FDE68A' } },
        right: { style: 'thin', color: { rgb: 'FDE68A' } },
      },
    },
    absMaladie: {
      fill: { fgColor: { rgb: 'FEE2E2' } }, // Soft red
      font: { name: 'Arial', sz: 9, bold: true, color: { rgb: 'B91C1C' } },
      alignment: { vertical: 'center', horizontal: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'FECACA' } },
        bottom: { style: 'thin', color: { rgb: 'FECACA' } },
        left: { style: 'thin', color: { rgb: 'FECACA' } },
        right: { style: 'thin', color: { rgb: 'FECACA' } },
      },
    },
    absMaternite: {
      fill: { fgColor: { rgb: 'FCE7F3' } }, // Soft pink
      font: { name: 'Arial', sz: 9, bold: true, color: { rgb: 'BE185D' } },
      alignment: { vertical: 'center', horizontal: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'FBCFE8' } },
        bottom: { style: 'thin', color: { rgb: 'FBCFE8' } },
        left: { style: 'thin', color: { rgb: 'FBCFE8' } },
        right: { style: 'thin', color: { rgb: 'FBCFE8' } },
      },
    },
    absFormation: {
      fill: { fgColor: { rgb: 'DCFCE7' } }, // Soft green
      font: { name: 'Arial', sz: 9, bold: true, color: { rgb: '15803D' } },
      alignment: { vertical: 'center', horizontal: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'BBF7D0' } },
        bottom: { style: 'thin', color: { rgb: 'BBF7D0' } },
        left: { style: 'thin', color: { rgb: 'BBF7D0' } },
        right: { style: 'thin', color: { rgb: 'BBF7D0' } },
      },
    },
    absOther: {
      fill: { fgColor: { rgb: 'F1F5F9' } }, // Soft blue-grey
      font: { name: 'Arial', sz: 9, bold: true, color: { rgb: '334155' } },
      alignment: { vertical: 'center', horizontal: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'CBD5E1' } },
        bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
        left: { style: 'thin', color: { rgb: 'CBD5E1' } },
        right: { style: 'thin', color: { rgb: 'CBD5E1' } },
      },
    },
    totalRow: {
      fill: { fgColor: { rgb: 'F1F5F9' } },
      font: { name: 'Arial', sz: 9, bold: true, color: { rgb: '0F172A' } },
      alignment: { vertical: 'center', horizontal: 'right' },
      border: {
        top: { style: 'medium', color: { rgb: '94A3B8' } },
        bottom: { style: 'double', color: { rgb: '475569' } },
        left: { style: 'thin', color: { rgb: 'CBD5E1' } },
        right: { style: 'thin', color: { rgb: 'CBD5E1' } },
      },
    },
  };

  /**
   * Ensure absences for the given year are loaded into the cache
   */
  public async ensureYearAbsencesLoaded(year: number): Promise<void> {
    const currentAbsences = this.absenceService.absences();
    const hasYearData = currentAbsences && currentAbsences.length > 0 && currentAbsences.some((a) => a.date.startsWith(`${year}-`));
    if (!hasYearData) {
      await this.absenceService.fetchAbsencesForYear(year);
    }
  }

  /**
   * Pre-index absences by employee ID and date for fast lookups
   */
  public buildAbsencesMap(absences: Absence[]): Map<string, Map<string, Absence[]>> {
    const map = new Map<string, Map<string, Absence[]>>();
    for (const a of absences) {
      if (!map.has(a.employee_id)) {
        map.set(a.employee_id, new Map<string, Absence[]>());
      }
      const empMap = map.get(a.employee_id)!;
      if (!empMap.has(a.date)) {
        empMap.set(a.date, []);
      }
      empMap.get(a.date)!.push(a);
    }
    return map;
  }

  /**
   * Calculate annual summary row for one employee
   */
  public calculateAnnualSummaryRow(
    emp: Employee,
    absMap: Map<string, Map<string, Absence[]>>,
    year: number
  ): EmployeeAnnualSummaryRow {
    const monthlyWorked: number[] = [];
    let workedDaysSum = 0;
    const empMap = absMap.get(emp.id!);

    for (let m = 0; m < 12; m++) {
      const daysInMonth = new Date(year, m + 1, 0).getDate();
      let businessDaysCount = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, m, d);
        const mm = String(m + 1).padStart(2, '0');
        const dd = String(d).padStart(2, '0');
        const dateStr = `${year}-${mm}-${dd}`;

        if (emp.arrival_date && dateStr < emp.arrival_date) continue;
        if (emp.departure_date && dateStr > emp.departure_date) continue;

        const dayOfWeek = date.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isFrenchPublicHoliday(date)) {
          businessDaysCount++;
        }
      }

      const mm = String(m + 1).padStart(2, '0');
      const monthPrefix = `${year}-${mm}-`;
      const dateMap = new Map<string, number>();

      if (empMap) {
        for (const [dateStr, list] of empMap.entries()) {
          if (!dateStr.startsWith(monthPrefix)) continue;
          if (emp.arrival_date && dateStr < emp.arrival_date) continue;
          if (emp.departure_date && dateStr > emp.departure_date) continue;

          const absDate = new Date(dateStr);
          const dayOfWeek = absDate.getDay();
          if (dayOfWeek === 0 || dayOfWeek === 6 || isFrenchPublicHoliday(absDate)) continue;

          for (const a of list) {
            if (a.category === 'Formation') continue;
            const current = dateMap.get(dateStr) || 0;
            dateMap.set(dateStr, current + (a.period === 'full' ? 1.0 : 0.5));
          }
        }
      }

      let totalAbsenceDays = 0;
      dateMap.forEach((val) => {
        totalAbsenceDays += Math.min(val, 1.0);
      });

      const worked = Math.max(businessDaysCount - totalAbsenceDays, 0);
      monthlyWorked.push(worked);
      workedDaysSum += worked;
    }

    const balance = emp.cd_employee_balances?.find((b) => b.year === year);
    const defaults =
      emp.contract_type === 'Interne' ? CONTRACT_DEFAULT_BALANCES.Interne : CONTRACT_DEFAULT_BALANCES.Externe;

    const initialCp = balance ? balance.initial_cp : defaults.initial_cp;
    const initialRtt = balance ? balance.initial_rtt : defaults.initial_rtt;
    const initialExceptional = balance ? balance.initial_exceptional : defaults.initial_exceptional;
    const initial = initialCp + initialRtt + initialExceptional;

    let usedInYear = 0;
    if (empMap) {
      const yearPrefix = `${year}-`;
      for (const [dateStr, list] of empMap.entries()) {
        if (!dateStr.startsWith(yearPrefix)) continue;
        for (const a of list) {
          if (a.category === 'Formation') continue;
          usedInYear += a.period === 'full' ? 1.0 : 0.5;
        }
      }
    }

    let decemberBalance = initial - usedInYear;
    if (emp.departure_date) {
      const departureYear = parseInt(emp.departure_date.split('-')[0], 10);
      if (departureYear <= year) {
        decemberBalance = 0;
      }
    }
    const annualTotal = workedDaysSum - decemberBalance;

    return {
      employee: emp,
      monthlyWorked,
      decemberBalance,
      annualTotal,
    };
  }

  /**
   * Build the Annual Summary worksheet ("Synthèse [Year]")
   */
  public buildAnnualSummarySheet(
    employees: Employee[],
    absMap: Map<string, Map<string, Absence[]>>,
    year: number
  ): XLSX.WorkSheet {
    const summaryRows = employees.map((emp) => this.calculateAnnualSummaryRow(emp, absMap, year));

    const totalMonthly = Array(12).fill(0);
    let totalDecemberBalance = 0;
    let totalAnnualTotal = 0;

    const wsData: any[][] = [];

    // Header row
    wsData.push([
      'Collaborateur',
      'Service',
      'Équipe',
      'Site',
      'Type de contrat',
      'Janvier',
      'Février',
      'Mars',
      'Avril',
      'Mai',
      'Juin',
      'Juillet',
      'Août',
      'Septembre',
      'Octobre',
      'Novembre',
      'Décembre',
      'Solde Déc.',
      'Total Annuel',
    ]);

    // Data rows
    summaryRows.forEach((r) => {
      const emp = r.employee;
      const row: any[] = [
        `${(emp.last_name || '').toUpperCase()} ${emp.first_name || ''}`,
        emp.service || '-',
        emp.team || '-',
        emp.work_site || '-',
        emp.contract_type || '-',
      ];

      for (let m = 0; m < 12; m++) {
        row.push(r.monthlyWorked[m]);
        totalMonthly[m] += r.monthlyWorked[m];
      }

      row.push(r.decemberBalance);
      row.push(r.annualTotal);

      totalDecemberBalance += r.decemberBalance;
      totalAnnualTotal += r.annualTotal;

      wsData.push(row);
    });

    // Total row
    const totalRow: any[] = [
      'TOTAL CUMULÉ',
      '',
      '',
      '',
      '',
      ...totalMonthly,
      totalDecemberBalance,
      totalAnnualTotal,
    ];
    wsData.push(totalRow);

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column widths
    ws['!cols'] = [
      { wch: 25 }, // Collaborateur
      { wch: 15 }, // Service
      { wch: 12 }, // Équipe
      { wch: 12 }, // Site
      { wch: 15 }, // Type de contrat
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 12 }, // Solde Déc.
      { wch: 12 }, // Total Annuel
    ];

    const totalRowIndex = wsData.length;

    // Apply styling
    for (const cellRef in ws) {
      if (cellRef.startsWith('!')) continue;
      const cell = ws[cellRef];
      if (!cell) continue;

      const match = cellRef.match(/^([A-Z]+)([0-9]+)$/);
      if (!match) continue;
      const row = parseInt(match[2], 10);

      if (row === 1) {
        cell.s = this.styles.header;
      } else if (row === totalRowIndex) {
        cell.s = this.styles.totalRow;
      } else {
        cell.s = cell.t === 'n' ? this.styles.cellNumber : this.styles.cellRegular;
      }
    }

    return ws;
  }

  /**
   * Build a detailed matrix sheet for one specific month
   */
  public buildDetailedMonthSheet(
    employees: Employee[],
    absMap: Map<string, Map<string, Absence[]>>,
    year: number,
    month: number // 0-11
  ): XLSX.WorkSheet {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const mm = String(month + 1).padStart(2, '0');

    // Build header row: Metadata cols + Day cols + Summary cols
    const headerRow: string[] = [
      'Collaborateur',
      'Service',
      'Équipe',
      'Site',
      'Type de contrat',
    ];

    const dayMeta: Array<{ dayNum: number; dayOfWeek: number; isWeekend: boolean; isHoliday: boolean; holidayName?: string | null }> = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = isFrenchPublicHoliday(date);
      const holidayName = isHoliday ? getFrenchPublicHolidayName(date) : undefined;

      dayMeta.push({ dayNum: d, dayOfWeek, isWeekend, isHoliday, holidayName });
      headerRow.push(`${d} ${FRENCH_DAYS_SHORT[dayOfWeek]}`);
    }

    headerRow.push('Jours ouvrés', 'Jours travaillés', 'Total absences');

    const wsData: any[][] = [headerRow];
    const cellStylesMap = new Map<string, any>();

    const totalDaysWorkedCol = Array(daysInMonth).fill(0);
    const totalDaysAbsenceCol = Array(daysInMonth).fill(0);
    let grandTotalWorkingDays = 0;
    let grandTotalWorkedDays = 0;
    let grandTotalAbsenceDays = 0;

    // Build data rows for each employee
    employees.forEach((emp, empIndex) => {
      const rowIndex = empIndex + 2; // 1-indexed in Excel (row 1 is header)
      const empMap = absMap.get(emp.id!);

      let empWorkingDays = 0;
      let empWorkedDays = 0;
      let empAbsenceDays = 0;

      const rowData: any[] = [
        `${(emp.last_name || '').toUpperCase()} ${emp.first_name || ''}`,
        emp.service || '-',
        emp.team || '-',
        emp.work_site || '-',
        emp.contract_type || '-',
      ];

      for (let d = 1; d <= daysInMonth; d++) {
        const meta = dayMeta[d - 1];
        const dd = String(d).padStart(2, '0');
        const dateStr = `${year}-${mm}-${dd}`;
        const colLetter = XLSX.utils.encode_col(4 + d); // 0-based col index: 0..4 meta, 5.. day 1
        const cellRef = `${colLetter}${rowIndex}`;

        const isBeforeArrival = emp.arrival_date ? dateStr < emp.arrival_date : false;
        const isAfterDeparture = emp.departure_date ? dateStr > emp.departure_date : false;
        const isUnavailable = isBeforeArrival || isAfterDeparture;

        if (meta.isWeekend) {
          rowData.push('');
          cellStylesMap.set(cellRef, this.styles.weekend);
        } else if (meta.isHoliday) {
          rowData.push('');
          cellStylesMap.set(cellRef, this.styles.holiday);
        } else if (isUnavailable) {
          rowData.push('');
          cellStylesMap.set(cellRef, this.styles.unavailable);
        } else {
          empWorkingDays += 1.0;

          const dayAbsences = empMap?.get(dateStr) || [];
          if (dayAbsences.length === 0) {
            // Worked day -> empty cell as requested!
            rowData.push('');
            cellStylesMap.set(cellRef, this.styles.cellDayEmpty);
            empWorkedDays += 1.0;
            totalDaysWorkedCol[d - 1] += 1.0;
          } else {
            // Count absence
            let totalAbsenceVal = 0;
            const category = dayAbsences[0].category;

            for (const a of dayAbsences) {
              if (a.category === 'Formation') continue;
              totalAbsenceVal += a.period === 'full' ? 1.0 : 0.5;
            }

            totalAbsenceVal = Math.min(totalAbsenceVal, 1.0);
            const workedVal = Math.max(1.0 - totalAbsenceVal, 0);

            empWorkedDays += workedVal;
            empAbsenceDays += totalAbsenceVal;
            totalDaysWorkedCol[d - 1] += workedVal;
            totalDaysAbsenceCol[d - 1] += totalAbsenceVal;

            if (totalAbsenceVal > 0) {
              // Just 1 or 0.5 as requested
              rowData.push(totalAbsenceVal);
              cellStylesMap.set(cellRef, this.getStyleForCategory(category));
            } else {
              // Only Formation or 0 absence
              rowData.push('');
              cellStylesMap.set(cellRef, this.styles.absFormation);
            }
          }
        }
      }

      // Summary columns for this employee
      rowData.push(empWorkingDays, empWorkedDays, empAbsenceDays);

      grandTotalWorkingDays += empWorkingDays;
      grandTotalWorkedDays += empWorkedDays;
      grandTotalAbsenceDays += empAbsenceDays;

      wsData.push(rowData);
    });

    // Total Row at the bottom
    const totalRowIndex = wsData.length + 1;
    const totalRow: any[] = [
      'TOTAL DU MOIS',
      '',
      '',
      '',
      '',
    ];

    for (let d = 1; d <= daysInMonth; d++) {
      const meta = dayMeta[d - 1];
      if (meta.isWeekend || meta.isHoliday) {
        totalRow.push('');
      } else {
        // Show total worked or absence in bottom row
        totalRow.push(totalDaysWorkedCol[d - 1]);
      }
    }

    totalRow.push(grandTotalWorkingDays, grandTotalWorkedDays, grandTotalAbsenceDays);
    wsData.push(totalRow);

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column widths
    const cols: XLSX.ColInfo[] = [
      { wch: 25 }, // Collaborateur
      { wch: 14 }, // Service
      { wch: 12 }, // Équipe
      { wch: 12 }, // Site
      { wch: 15 }, // Type de contrat
    ];

    for (let d = 1; d <= daysInMonth; d++) {
      cols.push({ wch: 6 }); // Day column
    }

    cols.push({ wch: 12 }, { wch: 14 }, { wch: 14 }); // Summary columns
    ws['!cols'] = cols;

    // Apply styles
    for (const cellRef in ws) {
      if (cellRef.startsWith('!')) continue;
      const cell = ws[cellRef];
      if (!cell) continue;

      const match = cellRef.match(/^([A-Z]+)([0-9]+)$/);
      if (!match) continue;
      const col = match[1];
      const row = parseInt(match[2], 10);
      const colIndex = XLSX.utils.decode_col(col);

      if (row === 1) {
        cell.s = this.styles.header;
      } else if (row === totalRowIndex) {
        cell.s = this.styles.totalRow;
      } else if (cellStylesMap.has(cellRef)) {
        cell.s = cellStylesMap.get(cellRef);
      } else {
        // Summary cols or metadata cols
        if (colIndex < 5) {
          cell.s = this.styles.cellRegular;
        } else {
          cell.s = this.styles.cellNumber;
        }
      }
    }

    return ws;
  }

  /**
   * Helper to retrieve style based on absence category
   */
  private getStyleForCategory(category: string): any {
    switch (category) {
      case 'CP':
        return this.styles.absCp;
      case 'RTT':
        return this.styles.absRtt;
      case 'Maladie':
        return this.styles.absMaladie;
      case 'Congé maternité':
        return this.styles.absMaternite;
      case 'Formation':
        return this.styles.absFormation;
      default:
        return this.styles.absOther;
    }
  }

  /**
   * Export single-sheet annual summary workbook
   */
  public async exportAnnualSummary(
    employees: Employee[],
    year: number,
    mode: 'all' | 'filtered'
  ): Promise<void> {
    try {
      await this.ensureYearAbsencesLoaded(year);
      const absences = this.absenceService.absences();
      const absMap = this.buildAbsencesMap(absences);

      const wb = XLSX.utils.book_new();
      const ws = this.buildAnnualSummarySheet(employees, absMap, year);
      XLSX.utils.book_append_sheet(wb, ws, `Synthèse ${year}`);

      const fileName = `Export_Annuel_${year}_${mode === 'filtered' ? 'filtre' : 'tous'}.xlsx`;
      XLSX.writeFile(wb, fileName);

      this.toastService.success(`Export annuel généré : ${fileName}`);
    } catch (err: any) {
      console.error('Erreur lors de la génération de l\'export annuel synthétique:', err);
      this.toastService.error('Erreur lors de la génération de l\'export annuel');
    }
  }

  /**
   * Export 13-sheet detailed annual workbook (1 summary + 12 monthly detailed sheets)
   */
  public async exportDetailedAnnualPresence(
    employees: Employee[],
    year: number,
    mode: 'all' | 'filtered'
  ): Promise<void> {
    try {
      this.toastService.info('Génération de l\'export annuel détaillé en cours...');

      await this.ensureYearAbsencesLoaded(year);
      const absences = this.absenceService.absences();
      const absMap = this.buildAbsencesMap(absences);

      const wb = XLSX.utils.book_new();

      // 1. First sheet: Synthèse [Year]
      const summaryWs = this.buildAnnualSummarySheet(employees, absMap, year);
      XLSX.utils.book_append_sheet(wb, summaryWs, `Synthèse ${year}`);

      // 2. Sheets 2 to 13: 01 - Janvier to 12 - Décembre
      for (let m = 0; m < 12; m++) {
        const monthNumStr = String(m + 1).padStart(2, '0');
        const sheetName = `${monthNumStr} - ${FRENCH_MONTHS_NAMES[m]}`;
        const monthWs = this.buildDetailedMonthSheet(employees, absMap, year, m);
        XLSX.utils.book_append_sheet(wb, monthWs, sheetName);
      }

      const fileName = `Export_Annuel_Detaille_${year}_${mode === 'filtered' ? 'filtre' : 'tous'}.xlsx`;
      XLSX.writeFile(wb, fileName);

      this.toastService.success(`Export annuel détaillé généré : ${fileName}`);
    } catch (err: any) {
      console.error('Erreur lors de la génération de l\'export annuel détaillé:', err);
      this.toastService.error('Erreur lors de la génération de l\'export annuel détaillé');
    }
  }
}
