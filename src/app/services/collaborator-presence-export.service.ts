import { Injectable, inject } from '@angular/core';
import * as XLSX from 'xlsx-js-style';
import { Employee, Absence } from '../models/types';
import { AbsenceService } from './absence.service';
import { isFrenchPublicHoliday, getFrenchPublicHolidayName } from '../../utils/holidays';
import { ToastService } from './toast.service';

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

      const wb = XLSX.utils.book_new();
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
        'Commentaire / Précision'
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
          row.comment || ''
        ]);
      }

      // Total row at bottom
      const totalRowIndex = wsData.length;
      wsData.push([
        'TOTAL DU MOIS',
        '',
        '',
        '',
        summary.totalWorkedDays,
        summary.totalAbsenceDays,
        '',
        ''
      ]);

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Column widths
      ws['!cols'] = [
        { wch: 14 }, // Date
        { wch: 14 }, // Jour
        { wch: 28 }, // Statut
        { wch: 20 }, // Période
        { wch: 16 }, // Jours Travaillés
        { wch: 16 }, // Jours Absence
        { wch: 22 }, // Type d'absence
        { wch: 35 }, // Commentaire
      ];

      // Merges
      ws['!merges'] = [
        // Title merge
        { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
        // Bottom total merge
        { s: { r: totalRowIndex, c: 0 }, e: { r: totalRowIndex, c: 3 } }
      ];

      // Styling
      const titleStyle = {
        font: { name: 'Arial', sz: 14, bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '1E3A8A' } }, // Dark navy blue
        alignment: { horizontal: 'center', vertical: 'center' }
      };

      const metaLabelStyle = {
        font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '334155' } },
        fill: { fgColor: { rgb: 'F8FAFC' } },
        border: {
          top: { style: 'thin', color: { rgb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
          left: { style: 'thin', color: { rgb: 'E2E8F0' } },
          right: { style: 'thin', color: { rgb: 'E2E8F0' } }
        }
      };

      const metaValueStyle = {
        font: { name: 'Arial', sz: 10 },
        border: {
          top: { style: 'thin', color: { rgb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
          left: { style: 'thin', color: { rgb: 'E2E8F0' } },
          right: { style: 'thin', color: { rgb: 'E2E8F0' } }
        }
      };

      const kpiHeaderStyle = {
        font: { name: 'Arial', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '3B82F6' } }, // Blue
        alignment: { horizontal: 'center' }
      };

      const kpiRowStyle = {
        font: { name: 'Arial', sz: 10, bold: true },
        fill: { fgColor: { rgb: 'F1F5F9' } },
        border: {
          top: { style: 'thin', color: { rgb: 'CBD5E1' } },
          bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
          left: { style: 'thin', color: { rgb: 'CBD5E1' } },
          right: { style: 'thin', color: { rgb: 'CBD5E1' } }
        }
      };

      const detailHeaderStyle = {
        font: { name: 'Arial', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '1E293B' } }, // Slate 800
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'medium', color: { rgb: '0F172A' } },
          bottom: { style: 'medium', color: { rgb: '0F172A' } }
        }
      };

      const regularRowStyle = {
        font: { name: 'Arial', sz: 10 },
        border: {
          top: { style: 'thin', color: { rgb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
          left: { style: 'thin', color: { rgb: 'E2E8F0' } },
          right: { style: 'thin', color: { rgb: 'E2E8F0' } }
        }
      };

      const weekendRowStyle = {
        font: { name: 'Arial', sz: 10, color: { rgb: '64748B' } },
        fill: { fgColor: { rgb: 'F8FAFC' } }, // Subtle gray
        border: {
          top: { style: 'thin', color: { rgb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
          left: { style: 'thin', color: { rgb: 'E2E8F0' } },
          right: { style: 'thin', color: { rgb: 'E2E8F0' } }
        }
      };

      const holidayRowStyle = {
        font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '0369A1' } },
        fill: { fgColor: { rgb: 'E0F2FE' } }, // Light blue
        border: {
          top: { style: 'thin', color: { rgb: 'BAE6FD' } },
          bottom: { style: 'thin', color: { rgb: 'BAE6FD' } },
          left: { style: 'thin', color: { rgb: 'BAE6FD' } },
          right: { style: 'thin', color: { rgb: 'BAE6FD' } }
        }
      };

      const absenceRowStyle = {
        font: { name: 'Arial', sz: 10, color: { rgb: '9A3412' } },
        fill: { fgColor: { rgb: 'FFEDD5' } }, // Light orange
        border: {
          top: { style: 'thin', color: { rgb: 'FED7AA' } },
          bottom: { style: 'thin', color: { rgb: 'FED7AA' } },
          left: { style: 'thin', color: { rgb: 'FED7AA' } },
          right: { style: 'thin', color: { rgb: 'FED7AA' } }
        }
      };

      const totalTableFooterStyle = {
        font: { name: 'Arial', sz: 11, bold: true, color: { rgb: '0F172A' } },
        fill: { fgColor: { rgb: 'E2E8F0' } },
        alignment: { horizontal: 'right' },
        border: {
          top: { style: 'medium', color: { rgb: '475569' } },
          bottom: { style: 'double', color: { rgb: '1E293B' } }
        }
      };

      // Apply cell styles across worksheet
      for (const cellRef in ws) {
        if (cellRef.startsWith('!')) continue;
        const cell = ws[cellRef];
        if (!cell) continue;

        const match = cellRef.match(/^([A-Z]+)([0-9]+)$/);
        if (!match) continue;
        const col = match[1];
        const row = parseInt(match[2], 10) - 1; // 0-indexed

        if (row === 0) {
          cell.s = titleStyle;
        } else if (row >= 2 && row <= 5) {
          if (col === 'A' || col === 'D') {
            cell.s = metaLabelStyle;
          } else {
            cell.s = metaValueStyle;
          }
        } else if (row === 7) {
          cell.s = kpiHeaderStyle;
        } else if (row >= 8 && row < detailHeaderIndex - 1) {
          cell.s = kpiRowStyle;
        } else if (row === detailHeaderIndex) {
          cell.s = detailHeaderStyle;
        } else if (row === totalRowIndex) {
          cell.s = totalTableFooterStyle;
        } else if (row > detailHeaderIndex && row < totalRowIndex) {
          const dayIndex = row - detailHeaderIndex - 1;
          const dayRow = summary.dailyRows[dayIndex];
          if (dayRow) {
            if (dayRow.isWeekend) {
              cell.s = weekendRowStyle;
            } else if (dayRow.isHoliday) {
              cell.s = holidayRowStyle;
            } else if (dayRow.absenceDays > 0) {
              cell.s = absenceRowStyle;
            } else {
              cell.s = regularRowStyle;
            }
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, `${FRENCH_MONTHS[month]} ${year}`);

      const cleanLastName = (employee.last_name || 'COLLABORATEUR').replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanFirstName = (employee.first_name || '').replace(/[^a-zA-Z0-9_-]/g, '_');
      const monthNumStr = String(month + 1).padStart(2, '0');
      const fileName = `Presence_${cleanLastName}_${cleanFirstName}_${year}-${monthNumStr}.xlsx`;

      XLSX.writeFile(wb, fileName);
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
