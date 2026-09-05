import { Injectable, inject } from '@angular/core';
import * as XLSX from 'xlsx-js-style';
import { Employee, Absence } from '../models/types';
import { EmployeeService } from './employee.service';
import { AbsenceService } from './absence.service';
import { isFrenchPublicHoliday } from '../../utils/holidays';
import { normalizeString } from '../shared/utils/string-utils';
import { ToastService } from './toast.service';

export interface TriskellMonthData {
  monthIndex: number; // 0 to 11 (0 = Janvier)
  monthLabel: string; // e.g. "JANV", "FEV", etc.
  consumedDays: number;
}

export interface TriskellRawEntry {
  unit: string;
  resourceId: string;
  resourceName: string;
  supplier: string;
  contract: string;
  sectionType: 'ESN' | 'Interne';
  months: { [monthIndex: number]: number }; // monthIndex (0-11) -> consumed days
}

export interface ReconciliationRow {
  resourceNameTriskell: string;
  unit: string;
  supplier: string;
  sectionType: 'ESN' | 'Interne';
  employee: Employee | null;
  isMatched: boolean;
  matchScore?: number; // 1 = high confidence
  consumedDays: number;
  crewdayzWorkedDays: number;
  difference: number; // consumedDays - crewdayzWorkedDays
  hasAnomaly: boolean;
  monthAbsences: Absence[];
}

export interface MonthReconciliationSummary {
  monthIndex: number;
  monthName: string;
  year: number;
  totalTriskellConsumed: number;
  totalCrewdayzWorked: number;
  matchedCount: number;
  unmatchedCount: number;
  anomalyCount: number;
  rows: ReconciliationRow[];
}

export interface TriskellParseResult {
  year: number;
  availableMonths: number[]; // e.g. [0, 1, 2, 3] for Jan-Apr
  rawEntries: TriskellRawEntry[];
  unmatchedNames: string[];
}

export const MONTH_ABBREVIATIONS: { [key: string]: number } = {
  janv: 0,
  janvier: 0,
  jan: 0,
  fev: 1,
  fevr: 1,
  fevrier: 1,
  'fevr.': 1,
  feb: 1,
  mars: 2,
  mar: 2,
  avril: 3,
  avr: 3,
  apr: 3,
  mai: 4,
  may: 4,
  juin: 5,
  jun: 5,
  juil: 6,
  juillet: 6,
  jul: 6,
  aout: 7,
  aou: 7,
  aug: 7,
  sept: 8,
  septembre: 8,
  sep: 8,
  oct: 9,
  octobre: 9,
  nov: 10,
  novembre: 10,
  dec: 11,
  decembre: 11,
};

export const FRENCH_MONTHS_NAMES = [
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
];

@Injectable({
  providedIn: 'root',
})
export class TriskellReconciliationService {
  private readonly employeeService = inject(EmployeeService);
  private readonly absenceService = inject(AbsenceService);
  private readonly toastService = inject(ToastService);

  /**
   * Parse Triskell Excel file (.xlsx or .xlsm) into structured raw entries
   */
  /**
   * Parse Triskell Excel file (.xlsx or .xlsm) into structured raw entries
   */
  public parseTriskellWorkbook(data: ArrayBuffer): TriskellParseResult {
    const workbook = XLSX.read(data, { type: 'array' });

    // Step 1: Find best candidate sheet
    const targetSheet = this.findBestSheet(workbook);
    if (!targetSheet) {
      throw new Error(
        "Impossible de trouver une feuille de suivi d'activité ou de plan de charge Triskell dans le classeur."
      );
    }

    const { sheet, type } = targetSheet;

    if (type === 'tcd_conso') {
      return this.parseTcdConsoSheet(sheet);
    } else if (type === 'tabular') {
      return this.parseTabularSheet(sheet);
    } else {
      return this.parseMatrixSheet(sheet);
    }
  }

  /**
   * Find the most relevant sheet in the workbook
   */
  private findBestSheet(workbook: XLSX.WorkBook): { sheet: XLSX.WorkSheet; type: 'tcd_conso' | 'matrix' | 'tabular' } | null {
    // 1. Priority 1: Check for 'tcd_conso' (Pivot table of consumed timesheet data)
    for (const name of workbook.SheetNames) {
      const normName = normalizeString(name);
      if (normName === 'tcd_conso' || (normName.includes('tcd') && normName.includes('conso'))) {
        const sheet = workbook.Sheets[name];
        if (sheet) return { sheet, type: 'tcd_conso' };
      }
    }

    // 2. Priority 2: Check for specific matrix sheets
    const priorityMatrixNames = [
      'atter. etp internes et esn',
      'atterrissage',
      'etp internes et esn',
      'plan de charge',
      'atter',
    ];

    for (const name of workbook.SheetNames) {
      const normName = normalizeString(name);
      if (priorityMatrixNames.some((p) => normName.includes(p))) {
        const sheet = workbook.Sheets[name];
        if (sheet) return { sheet, type: 'matrix' };
      }
    }

    // 3. Priority 3: Check for raw tabular sheets
    const priorityTabularNames = [
      '$$trk_tsf - pc_plan de charge',
      'pc_plan de charge',
      'plan de charge brut',
    ];

    for (const name of workbook.SheetNames) {
      const normName = normalizeString(name);
      if (priorityTabularNames.some((p) => normName.includes(p))) {
        const sheet = workbook.Sheets[name];
        if (sheet) return { sheet, type: 'tabular' };
      }
    }

    // 4. Scan all sheets for matrix format
    for (const name of workbook.SheetNames) {
      const sheet = workbook.Sheets[name];
      if (!sheet) continue;
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
      if (rows.length >= 5) {
        const monthCols = this.detectMonthColumns(rows);
        if (monthCols.size > 0) {
          return { sheet, type: 'matrix' };
        }
      }
    }

    // 5. Scan all sheets for tabular columns
    for (const name of workbook.SheetNames) {
      const sheet = workbook.Sheets[name];
      if (!sheet) continue;
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
      if (rows.length >= 2 && rows[0]) {
        const headerNorm = rows[0].map((h) => normalizeString(String(h)));
        if (
          headerNorm.some((h) => h.includes('ressource')) &&
          headerNorm.some((h) => h === 'mois') &&
          headerNorm.some((h) => h.includes('consomm'))
        ) {
          return { sheet, type: 'tabular' };
        }
      }
    }

    return null;
  }

  /**
   * Parse TCD Conso sheet (Tableau Croisé Dynamique de consommation Triskell)
   */
  private parseTcdConsoSheet(sheet: XLSX.WorkSheet): TriskellParseResult {
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
    if (rows.length < 5) {
      throw new Error('La feuille tcd_conso ne contient pas assez de données.');
    }

    // Step 1: Detect Year from top rows (e.g. row with 'Année')
    let detectedYear = new Date().getFullYear();
    for (let r = 0; r < Math.min(rows.length, 6); r++) {
      const row = rows[r];
      if (!row) continue;
      for (let c = 0; c < row.length; c++) {
        const cell = normalizeString(String(row[c] || '').trim());
        if (cell === 'annee' || cell === 'année') {
          const nextVal = parseInt(String(row[c + 1] || '').trim(), 10);
          if (!isNaN(nextVal) && nextVal >= 2020) {
            detectedYear = nextVal;
            break;
          }
        }
      }
    }

    // Step 2: Find Header row (contains 'Ressource' and numeric month columns 1, 2, 3...)
    let headerRowIdx = -1;
    let colResource = -1;
    let colUnit = -1;
    let colResourceId = -1;
    let colSupplier = -1;
    const monthColumns = new Map<number, number>(); // colIndex -> monthIndex (0-11)

    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const row = rows[r];
      if (!row) continue;

      const normRow = row.map((cell) => normalizeString(String(cell || '').trim()));
      const resIdx = normRow.findIndex((cell) => cell === 'ressource');

      if (resIdx !== -1) {
        headerRowIdx = r;
        colResource = resIdx;
        colUnit = normRow.findIndex((cell) => cell === 'unite' || cell === 'unité');
        colResourceId = normRow.findIndex((cell) => cell.includes('id_ressou') || cell.includes('id ressou'));
        colSupplier = normRow.findIndex((cell) => cell === 'fournisseur');

        // Look for month columns across this row
        for (let c = 0; c < row.length; c++) {
          const val = String(row[c] || '').trim();
          const monthNum = parseInt(val, 10);
          if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
            monthColumns.set(c, monthNum - 1);
          }
        }
        break;
      }
    }

    if (headerRowIdx === -1 || colResource === -1 || monthColumns.size === 0) {
      throw new Error("Impossible de localiser l'en-tête et les colonnes de mois dans tcd_conso.");
    }

    const availableMonths = Array.from(new Set(Array.from(monthColumns.values()))).sort((a, b) => a - b);
    const rawEntries: TriskellRawEntry[] = [];
    let currentUnit = '';

    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const rowJoined = row.slice(0, 5).join(' ');
      const normRowJoined = normalizeString(rowJoined);

      // Stop at 'Total général'
      if (normRowJoined.includes('total general') || normRowJoined.includes('total')) {
        break;
      }

      // Update unit if filled (since pivot tables often leave subsequent unit cells blank)
      if (colUnit !== -1 && row[colUnit] && String(row[colUnit]).trim() !== '') {
        const u = String(row[colUnit]).trim();
        if (u !== '(vide)' && u !== '-') currentUnit = u;
      }

      const rawResource = String(row[colResource] || '').trim();
      if (!rawResource || rawResource.length < 2) continue;

      const normRes = normalizeString(rawResource);
      if (normRes === 'ressource' || normRes.includes('total')) continue;

      const resourceId = colResourceId !== -1 ? String(row[colResourceId] || '').trim() : '';
      const rawSupplier = colSupplier !== -1 ? String(row[colSupplier] || '').trim() : '';
      const isInternal = !rawSupplier || rawSupplier === '(vide)' || rawSupplier === '-' || rawSupplier === 'vide';
      const sectionType: 'ESN' | 'Interne' = isInternal ? 'Interne' : 'ESN';

      const monthsData: { [monthIndex: number]: number } = {};
      for (const [colIdx, monthIdx] of monthColumns.entries()) {
        const rawVal = row[colIdx];
        if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
          const cleanNumStr = String(rawVal).replace(/\s/g, '').replace(',', '.');
          const val = parseFloat(cleanNumStr);
          if (!isNaN(val)) {
            monthsData[monthIdx] = val;
          }
        }
      }

      rawEntries.push({
        unit: currentUnit,
        resourceId,
        resourceName: rawResource,
        supplier: rawSupplier === '(vide)' ? '' : rawSupplier,
        contract: '',
        sectionType,
        months: monthsData,
      });
    }

    const employees = this.employeeService.employees();
    const unmatchedNames: string[] = [];

    for (const entry of rawEntries) {
      const match = this.matchEmployee(entry.resourceName, employees);
      if (!match) {
        unmatchedNames.push(entry.resourceName);
      }
    }

    return {
      year: detectedYear,
      availableMonths,
      rawEntries,
      unmatchedNames,
    };
  }

  /**
   * Parse tabular sheet (e.g. $$trk_TSF - PC_Plan de charge)
   */
  private parseTabularSheet(sheet: XLSX.WorkSheet): TriskellParseResult {
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
    if (rows.length < 2) {
      throw new Error('La feuille brute ne contient pas assez de données.');
    }

    const header = rows[0].map((h) => normalizeString(String(h).trim()));
    const colUnit = header.findIndex((h) => h === 'unite' || h === 'unité');
    const colResourceId = header.findIndex((h) => h === 'id_ressource' || h === 'id ressource');
    const colResource = header.findIndex((h) => h === 'ressource');
    const colType = header.findIndex((h) => h === 'type_ressource' || h === 'type');
    const colSupplier = header.findIndex((h) => h === 'fournisseur');
    const colYear = header.findIndex((h) => h === 'annee' || h === 'année');
    const colMonth = header.findIndex((h) => h === 'mois');
    const colConsumed = header.findIndex((h) => h.includes('consomm'));

    if (colResource === -1 || colMonth === -1 || colConsumed === -1) {
      throw new Error('Colonnes requises (Ressource, Mois, Consommé) introuvables.');
    }

    const entriesMap = new Map<string, TriskellRawEntry>();
    let detectedYear = new Date().getFullYear();
    const availableMonthsSet = new Set<number>();

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const rawResource = String(row[colResource] || '').trim();
      if (!rawResource || rawResource.length < 2) continue;

      if (colYear !== -1 && row[colYear]) {
        const y = parseInt(String(row[colYear]).trim(), 10);
        if (!isNaN(y) && y >= 2020) detectedYear = y;
      }

      const monthVal = parseInt(String(row[colMonth] || '').trim(), 10);
      if (isNaN(monthVal) || monthVal < 1 || monthVal > 12) continue;
      const monthIdx = monthVal - 1; // 0-11
      availableMonthsSet.add(monthIdx);

      const rawConsumed = String(row[colConsumed] || '').replace(/\s/g, '').replace(',', '.');
      const consumedDays = parseFloat(rawConsumed) || 0;

      const unit = colUnit !== -1 ? String(row[colUnit] || '').trim() : '';
      const resourceId = colResourceId !== -1 ? String(row[colResourceId] || '').trim() : '';
      const rawType = colType !== -1 ? String(row[colType] || '').trim() : '';
      const sectionType: 'ESN' | 'Interne' = normalizeString(rawType).includes('interne') ? 'Interne' : 'ESN';
      const supplier = colSupplier !== -1 ? String(row[colSupplier] || '').trim() : '';

      const key = `${rawResource}_${sectionType}_${unit}`;
      if (!entriesMap.has(key)) {
        entriesMap.set(key, {
          unit,
          resourceId,
          resourceName: rawResource,
          supplier,
          contract: '',
          sectionType,
          months: {},
        });
      }

      const entry = entriesMap.get(key)!;
      entry.months[monthIdx] = (entry.months[monthIdx] || 0) + consumedDays;
    }

    const rawEntries = Array.from(entriesMap.values());
    const employees = this.employeeService.employees();
    const unmatchedNames: string[] = [];

    for (const entry of rawEntries) {
      const match = this.matchEmployee(entry.resourceName, employees);
      if (!match) {
        unmatchedNames.push(entry.resourceName);
      }
    }

    const availableMonths = Array.from(availableMonthsSet).sort((a, b) => a - b);

    return {
      year: detectedYear,
      availableMonths: availableMonths.length > 0 ? availableMonths : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      rawEntries,
      unmatchedNames,
    };
  }

  /**
   * Parse visual matrix sheet (e.g. Atter. ETP internes et ESN)
   */
  private parseMatrixSheet(sheet: XLSX.WorkSheet): TriskellParseResult {
    // Convert to 2D array (dense matrix)
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: '',
    });

    if (rows.length < 5) {
      throw new Error('Le fichier ne contient pas assez de lignes pour être un export Triskell valide.');
    }

    // Detect Year from title lines (search for 202X or 203X)
    let detectedYear = new Date().getFullYear();
    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const rowText = rows[r].join(' ');
      const match = rowText.match(/\b(202\d|203\d)\b/);
      if (match) {
        detectedYear = parseInt(match[1], 10);
        break;
      }
    }

    // Identify month header structure
    const monthColumns = this.detectMonthColumns(rows);

    if (monthColumns.size === 0) {
      throw new Error(
        "Impossible de détecter les colonnes de mois (JANV, FEV, MARS...) et 'Consommé' dans le fichier."
      );
    }

    const availableMonths = Array.from(new Set(Array.from(monthColumns.values()))).sort((a, b) => a - b);

    // Extract entries from rows
    const rawEntries: TriskellRawEntry[] = [];
    let currentSection: 'ESN' | 'Interne' = 'ESN';

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const firstColsText = row.slice(0, 6).join(' ');
      const normalizedFirstCols = normalizeString(firstColsText);

      // Detect Section Changes
      if (normalizedFirstCols.includes('capacite interne') || normalizedFirstCols.includes('interne')) {
        currentSection = 'Interne';
        continue;
      }
      if (normalizedFirstCols.includes('previsionnel esn') || normalizedFirstCols.includes('esn')) {
        currentSection = 'ESN';
        continue;
      }

      // Ignore header rows and summary rows
      if (
        normalizedFirstCols.includes('total general') ||
        normalizedFirstCols.includes('tjm de l\'unite') ||
        normalizedFirstCols.includes('nb interne etp') ||
        normalizedFirstCols.includes('statut macro') ||
        normalizedFirstCols.includes('id_ressou') ||
        normalizedFirstCols.includes('fournisseur')
      ) {
        continue;
      }

      // Detect resource name column index
      // Col 2 in standard export, but search for non-empty text if shifted
      let rawResourceName = '';
      let resourceId = '';
      let unit = '';
      let supplier = '';
      let contract = '';

      if (row[2] && String(row[2]).trim().length >= 2 && !String(row[2]).match(/^\d+$/)) {
        unit = String(row[0] || '').trim();
        resourceId = String(row[1] || '').trim();
        rawResourceName = String(row[2] || '').trim();
        supplier = String(row[3] || '').trim();
        contract = String(row[4] || '').trim();
      } else if (row[1] && String(row[1]).trim().length >= 2 && !String(row[1]).match(/^\d+$/)) {
        rawResourceName = String(row[1] || '').trim();
        supplier = String(row[2] || '').trim();
        contract = String(row[3] || '').trim();
      }

      // Check if this row looks like a valid employee line
      if (!rawResourceName || rawResourceName.length < 2) {
        continue;
      }

      // If the resource name is a generic header label, ignore
      const normRes = normalizeString(rawResourceName);
      if (
        normRes === 'ressource' ||
        normRes === 'nom' ||
        normRes.includes('total') ||
        normRes.includes('capacite') ||
        normRes.includes('statut macro')
      ) {
        continue;
      }

      // Extract month values
      const monthsData: { [monthIndex: number]: number } = {};
      for (const [colIdx, monthIdx] of monthColumns.entries()) {
        const rawVal = row[colIdx];
        if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
          // Parse float (supporting comma or dot as decimal separator)
          const cleanNumStr = String(rawVal).replace(/\s/g, '').replace(',', '.');
          const val = parseFloat(cleanNumStr);
          if (!isNaN(val)) {
            monthsData[monthIdx] = (monthsData[monthIdx] || 0) + val;
          }
        }
      }

      rawEntries.push({
        unit,
        resourceId,
        resourceName: rawResourceName,
        supplier,
        contract,
        sectionType: currentSection,
        months: monthsData,
      });
    }

    const employees = this.employeeService.employees();
    const unmatchedNames: string[] = [];

    for (const entry of rawEntries) {
      const match = this.matchEmployee(entry.resourceName, employees);
      if (!match) {
        unmatchedNames.push(entry.resourceName);
      }
    }

    return {
      year: detectedYear,
      availableMonths,
      rawEntries,
      unmatchedNames,
    };
  }

  /**
   * Helper to detect which columns correspond to the 'Consommé' field of each month
   */
  private detectMonthColumns(rows: any[][]): Map<number, number> {
    const colToMonth = new Map<number, number>();

    // Step 1: Scan rows to find month labels
    // A month header can be in row 3 or 4 (0-indexed)
    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const row = rows[r];
      if (!row) continue;

      for (let c = 0; c < row.length; c++) {
        const cell = normalizeString(String(row[c] || '').trim());
        if (!cell) continue;

        // Check if cell is a month name/abbr
        if (cell in MONTH_ABBREVIATIONS) {
          const monthIdx = MONTH_ABBREVIATIONS[cell];

          // Now find the 'Consommé' column under/adjacent to this month
          // Check subsequent rows (r+1, r+2) and columns around c
          const consumedCol = this.findConsumedSubColumn(rows, r, c);
          if (consumedCol !== -1) {
            colToMonth.set(consumedCol, monthIdx);
          }
        }
      }
    }

    return colToMonth;
  }

  /**
   * Find the column index for "Consommé" in the span of a month
   */
  private findConsumedSubColumn(rows: any[][], monthHeaderRow: number, monthColStart: number): number {
    // Scan next row (e.g. row+1) from monthColStart up to monthColStart + 6
    const subHeaderRow = rows[monthHeaderRow + 1];
    if (subHeaderRow) {
      for (let c = monthColStart; c < Math.min(subHeaderRow.length, monthColStart + 6); c++) {
        const text = normalizeString(String(subHeaderRow[c] || '').trim());
        if (text.includes('consomm') || text.includes('consommé') || text.includes('consomm.')) {
          return c;
        }
      }
    }

    // If subheader row not directly below, scan row+2
    const subHeaderRow2 = rows[monthHeaderRow + 2];
    if (subHeaderRow2) {
      for (let c = monthColStart; c < Math.min(subHeaderRow2.length, monthColStart + 6); c++) {
        const text = normalizeString(String(subHeaderRow2[c] || '').trim());
        if (text.includes('consomm') || text.includes('consommé') || text.includes('consomm.')) {
          return c;
        }
      }
    }

    // Default fallback: if column 1 after monthColStart
    if (monthColStart + 1 < (rows[monthHeaderRow]?.length || 0)) {
      return monthColStart + 1;
    }

    return -1;
  }

  /**
   * Match raw Triskell resource string against Crewdayz employee list
   * Strategy:
   * 1. Remove parenthetical notes e.g. "(Fin de mission)"
   * 2. Normalize strings (remove accents, lowercase, hyphens to spaces, multiple spaces to single)
   * 3. Check if normalized resource contains both first_name and last_name
   * 4. Handle tokenized compound names and inverted patterns
   */
  public matchEmployee(rawResourceName: string, employees: Employee[]): Employee | null {
    if (!rawResourceName || !employees || employees.length === 0) {
      return null;
    }

    // Remove text inside parentheses (e.g. "(Fin de mission)", "(HIQ)", "(Démission)")
    const cleanRaw = rawResourceName.replace(/\(.*?\)/g, ' ');
    const normTarget = normalizeString(cleanRaw).replace(/[-_.,']/g, ' ').replace(/\s+/g, ' ').trim();

    for (const emp of employees) {
      const normFirst = normalizeString(emp.first_name || '').replace(/[-_.,']/g, ' ').replace(/\s+/g, ' ').trim();
      const normLast = normalizeString(emp.last_name || '').replace(/[-_.,']/g, ' ').replace(/\s+/g, ' ').trim();

      if (!normFirst && !normLast) continue;

      // 1. Check direct combined phrases (in both orders)
      const phrase1 = `${normFirst} ${normLast}`;
      const phrase2 = `${normLast} ${normFirst}`;

      if (normTarget.includes(phrase1) || normTarget.includes(phrase2)) {
        return emp;
      }

      // 2. Token-based matching: verify that every token of length >= 2 in first_name and last_name is in normTarget
      const firstTokens = normFirst.split(' ').filter((t) => t.length >= 2);
      const lastTokens = normLast.split(' ').filter((t) => t.length >= 2);

      const allFirstPresent = firstTokens.length > 0 && firstTokens.every((t) => normTarget.includes(t));
      const allLastPresent = lastTokens.length > 0 && lastTokens.every((t) => normTarget.includes(t));

      if (allFirstPresent && allLastPresent) {
        return emp;
      }
    }

    return null;
  }

  /**
   * Compute worked days for an employee for a specific year and month in Crewdayz
   * (Business days minus deductible absences)
   */
  public computeCrewdayzWorkedDays(
    employee: Employee,
    year: number,
    monthIndex: number, // 0-11
    absences: Absence[]
  ): { workedDays: number; monthAbsences: Absence[] } {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    let businessDaysCount = 0;

    // Filter absences for this employee in this month
    const mm = String(monthIndex + 1).padStart(2, '0');
    const monthPrefix = `${year}-${mm}-`;
    const empAbsences = absences.filter(
      (a) => a.employee_id === employee.id && a.date.startsWith(monthPrefix)
    );

    // Count business days (Mon-Fri, non-holiday, between arrival and departure)
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, monthIndex, d);
      const dd = String(d).padStart(2, '0');
      const dateStr = `${year}-${mm}-${dd}`;

      if (employee.arrival_date && dateStr < employee.arrival_date) {
        continue;
      }
      if (employee.departure_date && dateStr > employee.departure_date) {
        continue;
      }

      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isFrenchPublicHoliday(date)) {
        businessDaysCount++;
      }
    }

    // Calculate total absence days (excluding 'Formation')
    const dateMap = new Map<string, number>();

    for (const a of empAbsences) {
      if (a.category === 'Formation') continue;
      if (employee.arrival_date && a.date < employee.arrival_date) continue;
      if (employee.departure_date && a.date > employee.departure_date) continue;

      const absDate = new Date(a.date);
      const dayOfWeek = absDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6 || isFrenchPublicHoliday(absDate)) continue;

      const current = dateMap.get(a.date) || 0;
      dateMap.set(a.date, current + (a.period === 'full' ? 1.0 : 0.5));
    }

    let totalAbsenceDays = 0;
    dateMap.forEach((val) => {
      totalAbsenceDays += Math.min(val, 1.0);
    });

    const workedDays = Math.max(businessDaysCount - totalAbsenceDays, 0);

    return {
      workedDays: Math.round(workedDays * 10) / 10,
      monthAbsences: empAbsences,
    };
  }

  /**
   * Build complete reconciliation summary for a given month
   */
  public buildMonthReconciliation(
    parseResult: TriskellParseResult,
    targetMonthIndex: number
  ): MonthReconciliationSummary {
    const employees = this.employeeService.employees();
    const allAbsences = this.absenceService.absences();

    const rows: ReconciliationRow[] = [];
    let totalTriskellConsumed = 0;
    let totalCrewdayzWorked = 0;
    let matchedCount = 0;
    let unmatchedCount = 0;
    let anomalyCount = 0;

    for (const raw of parseResult.rawEntries) {
      const consumedDays = raw.months[targetMonthIndex] ?? 0;
      totalTriskellConsumed += consumedDays;

      const matchedEmp = this.matchEmployee(raw.resourceName, employees);

      if (matchedEmp) {
        matchedCount++;
        const { workedDays, monthAbsences } = this.computeCrewdayzWorkedDays(
          matchedEmp,
          parseResult.year,
          targetMonthIndex,
          allAbsences
        );

        totalCrewdayzWorked += workedDays;
        const diff = Math.round((consumedDays - workedDays) * 10) / 10;
        const hasAnomaly = Math.abs(diff) >= 0.01;

        if (hasAnomaly) {
          anomalyCount++;
        }

        rows.push({
          resourceNameTriskell: raw.resourceName,
          unit: raw.unit,
          supplier: raw.supplier,
          sectionType: raw.sectionType,
          employee: matchedEmp,
          isMatched: true,
          matchScore: 1,
          consumedDays,
          crewdayzWorkedDays: workedDays,
          difference: diff,
          hasAnomaly,
          monthAbsences,
        });
      } else {
        unmatchedCount++;
        anomalyCount++; // Unmatched is treated as an anomaly needing attention

        rows.push({
          resourceNameTriskell: raw.resourceName,
          unit: raw.unit,
          supplier: raw.supplier,
          sectionType: raw.sectionType,
          employee: null,
          isMatched: false,
          consumedDays,
          crewdayzWorkedDays: 0,
          difference: consumedDays,
          hasAnomaly: true,
          monthAbsences: [],
        });
      }
    }

    return {
      monthIndex: targetMonthIndex,
      monthName: FRENCH_MONTHS_NAMES[targetMonthIndex] || `Mois ${targetMonthIndex + 1}`,
      year: parseResult.year,
      totalTriskellConsumed: Math.round(totalTriskellConsumed * 10) / 10,
      totalCrewdayzWorked: Math.round(totalCrewdayzWorked * 10) / 10,
      matchedCount,
      unmatchedCount,
      anomalyCount,
      rows,
    };
  }

  /**
   * Export reconciliation summary to formatted Excel file
   */
  public exportReconciliationToExcel(summary: MonthReconciliationSummary): void {
    try {
      const wb = XLSX.utils.book_new();
      const wsData: any[][] = [];

      // Header
      wsData.push([`RAPPORT DE RAPPROCHEMENT TRISKELL / CREWDAYZ - ${summary.monthName.toUpperCase()} ${summary.year}`]);
      wsData.push(['']);
      wsData.push(['Total Consommé Triskell', summary.totalTriskellConsumed, 'jours']);
      wsData.push(['Total Travaillé Crewdayz', summary.totalCrewdayzWorked, 'jours']);
      wsData.push(['Nombre d\'anomalies / écarts', summary.anomalyCount]);
      wsData.push(['Collaborateurs non reconnus', summary.unmatchedCount]);
      wsData.push(['Date du contrôle', new Date().toLocaleDateString('fr-FR')]);
      wsData.push(['']);

      // Table Header
      wsData.push([
        'Ressource (Triskell)',
        'Section',
        'Unité',
        'Fournisseur',
        'Statut Matching',
        'Collaborateur Crewdayz',
        'Consommé Triskell (j)',
        'Travaillé Crewdayz (j)',
        'Écart (j)',
        'Diagnostic',
      ]);

      for (const row of summary.rows) {
        let statusMatching = 'Non reconnu';
        let empName = '-';
        let diagnostic = 'Non trouvé dans Crewdayz';

        if (row.isMatched && row.employee) {
          statusMatching = 'Reconnu';
          empName = `${row.employee.last_name.toUpperCase()} ${row.employee.first_name}`;
          if (row.hasAnomaly) {
            diagnostic = row.difference > 0 ? 'Surconsommation Triskell' : 'Sous-consommation Triskell';
          } else {
            diagnostic = 'Conforme (Écart 0)';
          }
        }

        wsData.push([
          row.resourceNameTriskell,
          row.sectionType,
          row.unit || '-',
          row.supplier || '-',
          statusMatching,
          empName,
          row.consumedDays,
          row.isMatched ? row.crewdayzWorkedDays : '-',
          row.isMatched ? row.difference : '-',
          diagnostic,
        ]);
      }

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Set column widths
      ws['!cols'] = [
        { wch: 30 }, // Ressource
        { wch: 12 }, // Section
        { wch: 16 }, // Unité
        { wch: 20 }, // Fournisseur
        { wch: 16 }, // Statut Matching
        { wch: 26 }, // Collaborateur Crewdayz
        { wch: 22 }, // Consommé Triskell
        { wch: 22 }, // Travaillé Crewdayz
        { wch: 12 }, // Écart
        { wch: 26 }, // Diagnostic
      ];

      XLSX.utils.book_append_sheet(wb, ws, `${summary.monthName} ${summary.year}`);

      const cleanMonth = summary.monthName.toLowerCase();
      const fileName = `Rapprochement_Triskell_Crewdayz_${summary.year}_${cleanMonth}.xlsx`;
      XLSX.writeFile(wb, fileName);

      this.toastService.success(`Export Excel généré : ${fileName}`);
    } catch (err: any) {
      console.error('Erreur lors de l\'export du rapport de réconciliation:', err);
      this.toastService.error('Erreur lors de la génération de l\'export Excel');
    }
  }
}
