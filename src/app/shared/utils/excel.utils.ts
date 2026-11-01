import ExcelJS from 'exceljs';

/**
 * Converts a 6-digit or 8-digit hex color into ExcelJS ARGB format (e.g. '1E3A8A' -> 'FF1E3A8A').
 */
export function hexToArgb(hex: string): string {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 6) {
    return 'FF' + clean.toUpperCase();
  }
  if (clean.length === 8) {
    return clean.toUpperCase();
  }
  return 'FF000000';
}

/**
 * Trigger file download in browser from an ExcelJS workbook.
 */
export async function saveWorkbook(workbook: ExcelJS.Workbook, fileName: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  if (typeof window !== 'undefined' && window.URL && typeof window.URL.createObjectURL === 'function') {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }
}

/**
 * Converts an ExcelJS worksheet into a 2D array of values, compatible with SheetJS sheet_to_json({ header: 1 }).
 */
export function worksheetTo2DArray(worksheet: ExcelJS.Worksheet): any[][] {
  const result: any[][] = [];
  const rowCount = worksheet.rowCount;
  const colCount = worksheet.columnCount;

  for (let r = 1; r <= rowCount; r++) {
    const row = worksheet.getRow(r);
    const rowValues: any[] = [];
    const maxCol = Math.max(colCount, row.cellCount);

    for (let c = 1; c <= maxCol; c++) {
      const cell = row.getCell(c);
      const val = cell.value;

      if (val === null || val === undefined) {
        rowValues.push('');
      } else if (typeof val === 'object') {
        if ('result' in val && (val as any).result !== undefined && (val as any).result !== null) {
          rowValues.push((val as any).result);
        } else if ('text' in val && (val as any).text !== undefined && (val as any).text !== null) {
          rowValues.push((val as any).text);
        } else if ('richText' in val && Array.isArray((val as any).richText)) {
          rowValues.push((val as any).richText.map((rt: any) => rt.text).join(''));
        } else if (val instanceof Date) {
          rowValues.push(val.toISOString());
        } else {
          rowValues.push(String(val));
        }
      } else {
        rowValues.push(val);
      }
    }
    result.push(rowValues);
  }

  return result;
}
