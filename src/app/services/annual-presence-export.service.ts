import { Injectable, inject } from '@angular/core';
import ExcelJS from 'exceljs';
import { Employee, Absence, CONTRACT_DEFAULT_BALANCES } from '../models/types';
import { AbsenceService } from './absence.service';
import { ToastService } from './toast.service';
import { isFrenchPublicHoliday, getFrenchPublicHolidayName } from '../../utils/holidays';
import { saveWorkbook } from '../shared/utils/excel.utils';

export const FRENCH_MONTHS_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export const FRENCH_DAYS_SHORT = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'];

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
   * Palette de styles pour l'export Excel
   */
  public readonly styles: Record<string, Partial<ExcelJS.Style>> = {
    header: {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }, // Navy 900
      font: { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } },
      alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
      border: {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF475569' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      },
    },
    metaHeader: {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }, // Slate 900
      font: { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF475569' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      },
    },
    cellRegular: {
      font: { name: 'Arial', size: 9 },
      alignment: { vertical: 'middle', horizontal: 'left' },
      border: {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      },
    },
    cellNumber: {
      font: { name: 'Arial', size: 9 },
      alignment: { vertical: 'middle', horizontal: 'right' },
      border: {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      },
    },
    cellDayEmpty: {
      font: { name: 'Arial', size: 9 },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      },
    },
    weekend: {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }, // Slate 100
      font: { name: 'Arial', size: 9, color: { argb: 'FF94A3B8' } },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      },
    },
    holiday: {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } }, // Sky 100
      font: { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0369A1' } },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: {
        top: { style: 'thin', color: { argb: 'FFBAE6FD' } },
        bottom: { style: 'thin', color: { argb: 'FFBAE6FD' } },
        left: { style: 'thin', color: { argb: 'FFBAE6FD' } },
        right: { style: 'thin', color: { argb: 'FFBAE6FD' } },
      },
    },
    unavailable: {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } },
      font: { name: 'Arial', size: 9, color: { argb: 'FF94A3B8' } },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      },
    },
    // Pastels for absence categories
    absCp: {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } }, // Soft purple
      font: { name: 'Arial', size: 9, bold: true, color: { argb: 'FF6B21A8' } },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: {
        top: { style: 'thin', color: { argb: 'FFE9D5FF' } },
        bottom: { style: 'thin', color: { argb: 'FFE9D5FF' } },
        left: { style: 'thin', color: { argb: 'FFE9D5FF' } },
        right: { style: 'thin', color: { argb: 'FFE9D5FF' } },
      },
    },
    absRtt: {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }, // Soft amber/orange
      font: { name: 'Arial', size: 9, bold: true, color: { argb: 'FFB45309' } },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: {
        top: { style: 'thin', color: { argb: 'FFFDE68A' } },
        bottom: { style: 'thin', color: { argb: 'FFFDE68A' } },
        left: { style: 'thin', color: { argb: 'FFFDE68A' } },
        right: { style: 'thin', color: { argb: 'FFFDE68A' } },
      },
    },
    absMaladie: {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }, // Soft red
      font: { name: 'Arial', size: 9, bold: true, color: { argb: 'FFB91C1C' } },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: {
        top: { style: 'thin', color: { argb: 'FFFECACA' } },
        bottom: { style: 'thin', color: { argb: 'FFFECACA' } },
        left: { style: 'thin', color: { argb: 'FFFECACA' } },
        right: { style: 'thin', color: { argb: 'FFFECACA' } },
      },
    },
    absMaternite: {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE7F3' } }, // Soft pink
      font: { name: 'Arial', size: 9, bold: true, color: { argb: 'FFBE185D' } },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: {
        top: { style: 'thin', color: { argb: 'FFFBCFE8' } },
        bottom: { style: 'thin', color: { argb: 'FFFBCFE8' } },
        left: { style: 'thin', color: { argb: 'FFFBCFE8' } },
        right: { style: 'thin', color: { argb: 'FFFBCFE8' } },
      },
    },
    absFormation: {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }, // Soft green
      font: { name: 'Arial', size: 9, bold: true, color: { argb: 'FF15803D' } },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: {
        top: { style: 'thin', color: { argb: 'FFBBF7D0' } },
        bottom: { style: 'thin', color: { argb: 'FFBBF7D0' } },
        left: { style: 'thin', color: { argb: 'FFBBF7D0' } },
        right: { style: 'thin', color: { argb: 'FFBBF7D0' } },
      },
    },
    absOther: {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }, // Soft blue-grey
      font: { name: 'Arial', size: 9, bold: true, color: { argb: 'FF334155' } },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      },
    },
    totalRow: {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } },
      font: { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F172A' } },
      alignment: { vertical: 'middle', horizontal: 'right' },
      border: {
        top: { style: 'medium', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'double', color: { argb: 'FF475569' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      },
    },
  };

  private applyCellStyle(cell: ExcelJS.Cell, style: Partial<ExcelJS.Style>): void {
    if (style.font) cell.font = style.font;
    if (style.fill) cell.fill = style.fill;
    if (style.border) cell.border = style.border;
    if (style.alignment) cell.alignment = style.alignment;
  }

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
    year: number,
    workbook?: ExcelJS.Workbook
  ): ExcelJS.Worksheet {
    const wb = workbook ?? new ExcelJS.Workbook();
    const ws = wb.addWorksheet(`Synthèse ${year}`);

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

    ws.addRows(wsData);

    // Column widths
    const colWidths = [
      25, // Collaborateur
      15, // Service
      12, // Équipe
      12, // Site
      15, // Type de contrat
      10, 10, 10, 10, 10, 10,
      10, 10, 10, 10, 10, 10,
      12, // Solde Déc.
      12, // Total Annuel
    ];
    colWidths.forEach((w, idx) => {
      ws.getColumn(idx + 1).width = w;
    });

    const totalRowIndex = wsData.length;

    // Apply styling
    for (let r = 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      for (let c = 1; c <= 19; c++) {
        const cell = row.getCell(c);
        if (r === 1) {
          this.applyCellStyle(cell, this.styles['header']);
        } else if (r === totalRowIndex) {
          this.applyCellStyle(cell, this.styles['totalRow']);
        } else {
          const isNumberCol = c >= 6;
          this.applyCellStyle(cell, isNumberCol ? this.styles['cellNumber'] : this.styles['cellRegular']);
        }
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
    month: number, // 0-11
    workbook?: ExcelJS.Workbook
  ): ExcelJS.Worksheet {
    const wb = workbook ?? new ExcelJS.Workbook();
    const monthNumStr = String(month + 1).padStart(2, '0');
    const ws = wb.addWorksheet(`${monthNumStr} - ${FRENCH_MONTHS_NAMES[month]}`);

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
    const cellStylesMap = new Map<string, Partial<ExcelJS.Style>>();

    const totalDaysWorkedCol = Array(daysInMonth).fill(0);
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
        const colIndex = 5 + d; // 1-based col index: 1..5 meta, 6.. day 1
        const cellKey = `${rowIndex},${colIndex}`;

        const isBeforeArrival = emp.arrival_date ? dateStr < emp.arrival_date : false;
        const isAfterDeparture = emp.departure_date ? dateStr > emp.departure_date : false;
        const isUnavailable = isBeforeArrival || isAfterDeparture;

        if (meta.isWeekend) {
          rowData.push('');
          cellStylesMap.set(cellKey, this.styles['weekend']);
        } else if (meta.isHoliday) {
          rowData.push('');
          cellStylesMap.set(cellKey, this.styles['holiday']);
        } else if (isUnavailable) {
          rowData.push('');
          cellStylesMap.set(cellKey, this.styles['unavailable']);
        } else {
          empWorkingDays += 1.0;

          const dayAbsences = empMap?.get(dateStr) || [];
          if (dayAbsences.length === 0) {
            // Worked day -> empty cell as requested!
            rowData.push('');
            cellStylesMap.set(cellKey, this.styles['cellDayEmpty']);
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

            if (totalAbsenceVal > 0) {
              // Just 1 or 0.5 as requested
              rowData.push(totalAbsenceVal);
              cellStylesMap.set(cellKey, this.getStyleForCategory(category));
            } else {
              // Only Formation or 0 absence
              rowData.push('');
              cellStylesMap.set(cellKey, this.styles['absFormation']);
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
        // Show total worked in bottom row
        totalRow.push(totalDaysWorkedCol[d - 1]);
      }
    }

    totalRow.push(grandTotalWorkingDays, grandTotalWorkedDays, grandTotalAbsenceDays);
    wsData.push(totalRow);

    ws.addRows(wsData);

    // Column widths
    const colWidths = [
      25, // Collaborateur
      14, // Service
      12, // Équipe
      12, // Site
      15, // Type de contrat
    ];

    for (let d = 1; d <= daysInMonth; d++) {
      colWidths.push(6); // Day column
    }

    colWidths.push(12, 14, 14); // Summary columns
    colWidths.forEach((w, idx) => {
      ws.getColumn(idx + 1).width = w;
    });

    const totalCols = 5 + daysInMonth + 3;

    // Apply styles
    for (let r = 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      for (let c = 1; c <= totalCols; c++) {
        const cell = row.getCell(c);
        const cellKey = `${r},${c}`;

        if (r === 1) {
          this.applyCellStyle(cell, this.styles['header']);
        } else if (r === totalRowIndex) {
          this.applyCellStyle(cell, this.styles['totalRow']);
        } else if (cellStylesMap.has(cellKey)) {
          this.applyCellStyle(cell, cellStylesMap.get(cellKey)!);
        } else {
          // Summary cols or metadata cols
          if (c <= 5) {
            this.applyCellStyle(cell, this.styles['cellRegular']);
          } else {
            this.applyCellStyle(cell, this.styles['cellNumber']);
          }
        }
      }
    }

    return ws;
  }

  /**
   * Helper to retrieve style based on absence category
   */
  private getStyleForCategory(category: string): Partial<ExcelJS.Style> {
    switch (category) {
      case 'CP':
        return this.styles['absCp'];
      case 'RTT':
        return this.styles['absRtt'];
      case 'Maladie':
        return this.styles['absMaladie'];
      case 'Congé maternité':
        return this.styles['absMaternite'];
      case 'Formation':
        return this.styles['absFormation'];
      default:
        return this.styles['absOther'];
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

      const wb = new ExcelJS.Workbook();
      this.buildAnnualSummarySheet(employees, absMap, year, wb);

      const fileName = `Export_Annuel_${year}_${mode === 'filtered' ? 'filtre' : 'tous'}.xlsx`;
      await saveWorkbook(wb, fileName);

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

      const wb = new ExcelJS.Workbook();

      // 1. First sheet: Synthèse [Year]
      this.buildAnnualSummarySheet(employees, absMap, year, wb);

      // 2. Sheets 2 to 13: 01 - Janvier to 12 - Décembre
      for (let m = 0; m < 12; m++) {
        this.buildDetailedMonthSheet(employees, absMap, year, m, wb);
      }

      const fileName = `Export_Annuel_Detaille_${year}_${mode === 'filtered' ? 'filtre' : 'tous'}.xlsx`;
      await saveWorkbook(wb, fileName);

      this.toastService.success(`Export annuel détaillé généré : ${fileName}`);
    } catch (err: any) {
      console.error('Erreur lors de la génération de l\'export annuel détaillé:', err);
      this.toastService.error('Erreur lors de la génération de l\'export annuel détaillé');
    }
  }
}
