import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { hexToArgb, worksheetTo2DArray, saveWorkbook } from './excel.utils';

describe('excel.utils', () => {
  describe('hexToArgb', () => {
    it('should convert 6-character hex to ARGB with FF prefix', () => {
      expect(hexToArgb('1E3A8A')).toBe('FF1E3A8A');
      expect(hexToArgb('#1E3A8A')).toBe('FF1E3A8A');
    });

    it('should preserve 8-character hex', () => {
      expect(hexToArgb('AABBCCDD')).toBe('AABBCCDD');
      expect(hexToArgb('#AABBCCDD')).toBe('AABBCCDD');
    });

    it('should return black fallback for invalid length', () => {
      expect(hexToArgb('123')).toBe('FF000000');
    });
  });

  describe('worksheetTo2DArray', () => {
    it('should convert an empty or simple worksheet into a 2D array', () => {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Sheet1');
      ws.addRow(['Nom', 'Prénom', 'Valeur']);
      ws.addRow(['Dupont', 'Jean', 42]);

      const array = worksheetTo2DArray(ws);
      expect(array.length).toBe(2);
      expect(array[0]).toEqual(['Nom', 'Prénom', 'Valeur']);
      expect(array[1]).toEqual(['Dupont', 'Jean', 42]);
    });

    it('should handle formula results and rich text gracefully', () => {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Sheet2');
      ws.addRow(['A', { formula: 'SUM(1, 2)', result: 3 }]);
      ws.addRow(['B', { richText: [{ text: 'Hello ' }, { text: 'World' }] }]);

      const array = worksheetTo2DArray(ws);
      expect(array.length).toBe(2);
      expect(array[0][1]).toBe(3);
      expect(array[1][1]).toBe('Hello World');
    });
  });

  describe('saveWorkbook', () => {
    it('should not throw when saving workbook in non-browser or test environment', async () => {
      const wb = new ExcelJS.Workbook();
      wb.addWorksheet('Sheet1').addRow(['Test']);
      await expect(saveWorkbook(wb, 'test.xlsx')).resolves.toBeUndefined();
    });
  });
});
