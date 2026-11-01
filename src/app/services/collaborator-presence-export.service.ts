import { Injectable, inject } from '@angular/core';
import ExcelJS from 'exceljs';
import { Employee, Absence } from '../models/types';
import { AbsenceService } from './absence.service';
import { isFrenchPublicHoliday, getFrenchPublicHolidayName } from '../../utils/holidays';
import { ToastService } from './toast.service';
import { saveWorkbook } from '../shared/utils/excel.utils';

export interface DayExportRow {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  dayName: string; // Lundi, Mardi...
  dayNum: number;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string | null;
  isWorkingDay: boolean; // Not weekend and not holiday
  workedDays: number; // 0, 0.5, or 1.0
  absenceDays: number; // 0, 0.5, or 1.0
  status: string; // "Présent", "Férié (Nom)", "Week-end", "Absence"
  category?: string; // CP, RTT, etc.
  period?: 'full' | 'morning' | 'afternoon' | string;
  comment?: string;
}

export interface MonthlyPresenceSummary {
  month: number; // 0-11
  year: number;
  monthLabel: string; // "Janvier 2026"
  totalCalendarDays: number;
  totalWorkingDays: number; // Total jours ouvrés
  totalWorkedDays: number; // Total jours travaillés
  totalAbsenceDays: number; // Total jours d'absence
  absencesByCategory: { [category: string]: number };
  dailyRows: DayExportRow[];
}

const FRENCH_MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const FRENCH_DAYS_FULL = [
  'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'
];

@Injectable({
  providedIn: 'root',
})
export class CollaboratorPresenceExportService {
  private readonly absenceService = inject(AbsenceService);
  private readonly toastService = inject(ToastService);

  /**
   * Calculate full breakdown and summary for a given collaborator and month
   */
  public computeMonthlySummary(
    employee: Employee,
    year: number,
    month: number, // 0-11
    absences: Absence[]
  ): MonthlyPresenceSummary {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dailyRows: DayExportRow[] = [];
    const absencesByCategory: { [category: string]: number } = {};

    let totalWorkingDays = 0;
    let totalWorkedDays = 0;
    let totalAbsenceDays = 0;

    // Filter absences for this employee in this month
    const empAbsences = absences.filter((a) => {
      if (a.employee_id !== employee.id) return false;
      const [aYear, aMonth] = a.date.split('-').map((v) => parseInt(v, 10));
      return aYear === year && aMonth === month + 1;
    });

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay(); // 0 = Dimanche, 6 = Samedi
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = isFrenchPublicHoliday(date);
      const holidayName = isHoliday ? getFrenchPublicHolidayName(date) : undefined;
      const isWorkingDay = !isWeekend && !isHoliday;

      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayName = FRENCH_DAYS_FULL[dayOfWeek];

      // Check for absences on this date
      const dayAbsences = empAbsences.filter((a) => a.date === dateStr);

      let workedDays = 0;
      let absenceDays = 0;
      let status = '';
      let category = '';
      let period = '';
      let comment = '';

      if (isWeekend) {
        status = 'Week-end';
        workedDays = 0;
        absenceDays = 0;
      } else if (isHoliday) {
        status = `Férié (${holidayName})`;
        workedDays = 0;
        absenceDays = 0;
      } else {
        totalWorkingDays += 1;

        if (dayAbsences.length === 0) {
          status = 'Présent / Travaillé';
          workedDays = 1.0;
          absenceDays = 0;
        } else {
          // If full day or multiple half days
          const fullAbs = dayAbsences.find((a) => a.period === 'full');
          if (fullAbs) {
            status = `Absence - ${fullAbs.category}`;
            category = fullAbs.category;
            period = 'Journée complète';
            comment = fullAbs.comment || '';
            workedDays = 0;
            absenceDays = 1.0;

            absencesByCategory[fullAbs.category] = (absencesByCategory[fullAbs.category] || 0) + 1.0;
          } else {
            // Half day(s)
            const morningAbs = dayAbsences.find((a) => a.period === 'morning');
            const afternoonAbs = dayAbsences.find((a) => a.period === 'afternoon');

            if (morningAbs && afternoonAbs) {
              status = `Absence - ${morningAbs.category} / ${afternoonAbs.category}`;
              category = morningAbs.category === afternoonAbs.category ? morningAbs.category : `${morningAbs.category}, ${afternoonAbs.category}`;
              period = 'Matin + Après-midi';
              comment = [morningAbs.comment, afternoonAbs.comment].filter(Boolean).join(' | ');
              workedDays = 0;
              absenceDays = 1.0;

              absencesByCategory[morningAbs.category] = (absencesByCategory[morningAbs.category] || 0) + 0.5;
              absencesByCategory[afternoonAbs.category] = (absencesByCategory[afternoonAbs.category] || 0) + 0.5;
            } else if (morningAbs) {
              status = `Absence (Matin) - ${morningAbs.category}`;
              category = morningAbs.category;
              period = 'Matin';
              comment = morningAbs.comment || '';
              workedDays = 0.5;
              absenceDays = 0.5;

              absencesByCategory[morningAbs.category] = (absencesByCategory[morningAbs.category] || 0) + 0.5;
            } else if (afternoonAbs) {
              status = `Absence (Après-midi) - ${afternoonAbs.category}`;
              category = afternoonAbs.category;
              period = 'Après-midi';
              comment = afternoonAbs.comment || '';
              workedDays = 0.5;
              absenceDays = 0.5;

              absencesByCategory[afternoonAbs.category] = (absencesByCategory[afternoonAbs.category] || 0) + 0.5;
            }
          }
        }

        totalWorkedDays += workedDays;
        totalAbsenceDays += absenceDays;
      }

      dailyRows.push({
        date,
        dateStr,
        dayName,
        dayNum: day,
        isWeekend,
        isHoliday,
        holidayName,
        isWorkingDay,
        workedDays,
        absenceDays,
        status,
        category,
        period,
        comment,
      });
    }

    return {
      month,
      year,
      monthLabel: `${FRENCH_MONTHS[month]} ${year}`,
      totalCalendarDays: daysInMonth,
      totalWorkingDays,
      totalWorkedDays,
      totalAbsenceDays,
      absencesByCategory,
      dailyRows,
    };
  }

  /**
   * Generate and trigger download of the Excel workbook
   */
  public async exportCollaboratorMonthlyPresence(
    employee: Employee,
    year: number,
    month: number // 0-11
  ): Promise<void> {
    try {
      // Ensure absences for the given year are loaded
      let absences = this.absenceService.absences();
      if (!absences || absences.length === 0 || !absences.some((a) => a.date.startsWith(`${year}-`))) {
        await this.absenceService.fetchAbsencesForYear(year);
        absences = this.absenceService.absences();
      }

      const summary = this.computeMonthlySummary(employee, year, month, absences);

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(`${FRENCH_MONTHS[month]} ${year}`);

      const wsData: any[][] = [];

      // Title & Employee metadata block
      wsData.push(['RELEVÉ MENSUEL D\'ACTIVITÉ & DE PRÉSENCE']); // Row 1
      wsData.push(['']); // Row 2 empty
      wsData.push(['Collaborateur :', `${employee.last_name.toUpperCase()} ${employee.first_name}`, '', 'Période :', summary.monthLabel]); // Row 3
      wsData.push(['Service :', employee.service || '-', '', 'Type de contrat :', employee.contract_type || '-']); // Row 4
      wsData.push(['Équipe / Îlot :', employee.team || '-', '', 'Société / Prestataire :', employee.company_name || 'N/A']); // Row 5
      wsData.push(['Site de travail :', employee.work_site || '-', '', 'Date d\'export :', new Date().toLocaleDateString('fr-FR')]); // Row 6
      wsData.push(['']); // Row 7 empty

      // KPI Summary Block
      wsData.push(['SYNTHÈSE DU MOIS', 'VALEUR', 'UNITE']); // Row 8
      wsData.push(['Jours ouvrés théoriques', summary.totalWorkingDays, 'jours']); // Row 9
      wsData.push(['Jours travaillés réels', summary.totalWorkedDays, 'jours']); // Row 10
      wsData.push(['Total jours d\'absence', summary.totalAbsenceDays, 'jours']); // Row 11

      const catKeys = Object.keys(summary.absencesByCategory);
      if (catKeys.length > 0) {
        for (const cat of catKeys) {
          wsData.push([`  • Dont ${cat}`, summary.absencesByCategory[cat], 'jours']);
        }
      }
      wsData.push(['']); // empty row separator

      // Detail Table Header
      const detailHeaderIndex = wsData.length;
      wsData.push([
        'Date',
        'Jour',
        'Statut de la journée',
        'Période',
        'Jours Travaillés',
        'Jours Absence',
        'Type d\'absence',
        'Commentaire / Précision',
      ]);

      // Add each day
      for (const row of summary.dailyRows) {
        const formattedDate = `${String(row.dayNum).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
        wsData.push([
          formattedDate,
          row.dayName,
          row.status,
          row.period || (row.isWeekend ? 'Week-end' : row.isHoliday ? 'Férié' : 'Journée complète'),
          row.workedDays,
          row.absenceDays,
          row.category || '',
          row.comment || '',
        ]);
      }

      // Total row at bottom
      const totalRowIndex = wsData.length + 1; // 1-indexed in Excel
      wsData.push([
        'TOTAL DU MOIS',
        '',
        '',
        '',
        summary.totalWorkedDays,
        summary.totalAbsenceDays,
        '',
        '',
      ]);

      ws.addRows(wsData);

      // Column widths
      const colWidths = [14, 14, 28, 20, 16, 16, 22, 35];
      colWidths.forEach((width, index) => {
        ws.getColumn(index + 1).width = width;
      });

      // Merges (ExcelJS 1-indexed)
      // Title merge: row 1, col 1 to 8
      ws.mergeCells(1, 1, 1, 8);
      // Bottom total merge: row totalRowIndex, col 1 to 4
      ws.mergeCells(totalRowIndex, 1, totalRowIndex, 4);

      // Styles
      const titleStyle: Partial<ExcelJS.Style> = {
        font: { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
      };

      const metaLabelStyle: Partial<ExcelJS.Style> = {
        font: { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } },
        border: {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        },
        alignment: { vertical: 'middle' },
      };

      const metaValueStyle: Partial<ExcelJS.Style> = {
        font: { name: 'Arial', size: 10 },
        border: {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        },
        alignment: { vertical: 'middle' },
      };

      const kpiHeaderStyle: Partial<ExcelJS.Style> = {
        font: { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
      };

      const kpiRowStyle: Partial<ExcelJS.Style> = {
        font: { name: 'Arial', size: 10, bold: true },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } },
        border: {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        },
        alignment: { vertical: 'middle' },
      };

      const detailHeaderStyle: Partial<ExcelJS.Style> = {
        font: { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: {
          top: { style: 'medium', color: { argb: 'FF0F172A' } },
          bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
          left: { style: 'thin', color: { argb: 'FF334155' } },
          right: { style: 'thin', color: { argb: 'FF334155' } },
        },
      };

      const regularRowStyle: Partial<ExcelJS.Style> = {
        font: { name: 'Arial', size: 10 },
        border: {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        },
        alignment: { vertical: 'middle' },
      };

      const weekendRowStyle: Partial<ExcelJS.Style> = {
        font: { name: 'Arial', size: 10, color: { argb: 'FF64748B' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } },
        border: {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        },
        alignment: { vertical: 'middle' },
      };

      const holidayRowStyle: Partial<ExcelJS.Style> = {
        font: { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0369A1' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } },
        border: {
          top: { style: 'thin', color: { argb: 'FFBAE6FD' } },
          bottom: { style: 'thin', color: { argb: 'FFBAE6FD' } },
          left: { style: 'thin', color: { argb: 'FFBAE6FD' } },
          right: { style: 'thin', color: { argb: 'FFBAE6FD' } },
        },
        alignment: { vertical: 'middle' },
      };

      const absenceRowStyle: Partial<ExcelJS.Style> = {
        font: { name: 'Arial', size: 10, color: { argb: 'FF9A3412' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEDD5' } },
        border: {
          top: { style: 'thin', color: { argb: 'FFFED7AA' } },
          bottom: { style: 'thin', color: { argb: 'FFFED7AA' } },
          left: { style: 'thin', color: { argb: 'FFFED7AA' } },
          right: { style: 'thin', color: { argb: 'FFFED7AA' } },
        },
        alignment: { vertical: 'middle' },
      };

      const totalTableFooterStyle: Partial<ExcelJS.Style> = {
        font: { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } },
        alignment: { horizontal: 'right', vertical: 'middle' },
        border: {
          top: { style: 'medium', color: { argb: 'FF475569' } },
          bottom: { style: 'double', color: { argb: 'FF1E293B' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        },
      };

      const applyStyle = (cell: ExcelJS.Cell, style: Partial<ExcelJS.Style>) => {
        if (style.font) cell.font = style.font;
        if (style.fill) cell.fill = style.fill;
        if (style.border) cell.border = style.border;
        if (style.alignment) cell.alignment = style.alignment;
      };

      // Apply cell styles across worksheet
      for (let r = 1; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const rowIndex0 = r - 1; // 0-indexed corresponding to wsData

        if (rowIndex0 === 0) {
          for (let c = 1; c <= 8; c++) applyStyle(row.getCell(c), titleStyle);
        } else if (rowIndex0 >= 2 && rowIndex0 <= 5) {
          for (let c = 1; c <= 5; c++) {
            if (c === 1 || c === 4) {
              applyStyle(row.getCell(c), metaLabelStyle);
            } else {
              applyStyle(row.getCell(c), metaValueStyle);
            }
          }
        } else if (rowIndex0 === 7) {
          for (let c = 1; c <= 3; c++) applyStyle(row.getCell(c), kpiHeaderStyle);
        } else if (rowIndex0 >= 8 && rowIndex0 < detailHeaderIndex - 1) {
          for (let c = 1; c <= 3; c++) applyStyle(row.getCell(c), kpiRowStyle);
        } else if (rowIndex0 === detailHeaderIndex) {
          for (let c = 1; c <= 8; c++) applyStyle(row.getCell(c), detailHeaderStyle);
        } else if (r === totalRowIndex) {
          for (let c = 1; c <= 8; c++) applyStyle(row.getCell(c), totalTableFooterStyle);
        } else if (rowIndex0 > detailHeaderIndex && r < totalRowIndex) {
          const dayIndex = rowIndex0 - detailHeaderIndex - 1;
          const dayRow = summary.dailyRows[dayIndex];
          if (dayRow) {
            let rowStyle = regularRowStyle;
            if (dayRow.isWeekend) {
              rowStyle = weekendRowStyle;
            } else if (dayRow.isHoliday) {
              rowStyle = holidayRowStyle;
            } else if (dayRow.absenceDays > 0) {
              rowStyle = absenceRowStyle;
            }
            for (let c = 1; c <= 8; c++) applyStyle(row.getCell(c), rowStyle);
          }
        }
      }

      const cleanLastName = (employee.last_name || 'COLLABORATEUR').replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanFirstName = (employee.first_name || '').replace(/[^a-zA-Z0-9_-]/g, '_');
      const monthNumStr = String(month + 1).padStart(2, '0');
      const fileName = `Presence_${cleanLastName}_${cleanFirstName}_${year}-${monthNumStr}.xlsx`;

      await saveWorkbook(wb, fileName);
      this.toastService.success(`Export Excel généré pour ${employee.first_name} ${employee.last_name}`);
    } catch (err: any) {
      console.error('Failed to export collaborator presence:', err);
      this.toastService.error('Erreur lors de la génération de l\'export Excel');
    }
  }

  /**
   * Helper to export previous month for a collaborator
   */
  public async exportCollaboratorPreviousMonth(employee: Employee): Promise<void> {
    const now = new Date();
    let targetMonth = now.getMonth() - 1;
    let targetYear = now.getFullYear();

    if (targetMonth < 0) {
      targetMonth = 11;
      targetYear -= 1;
    }

    await this.exportCollaboratorMonthlyPresence(employee, targetYear, targetMonth);
  }
}
