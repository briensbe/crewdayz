import { describe, it, expect } from 'vitest';
import {
  normalizeString,
  includesNormalized,
  matchesSearch,
  matchesEmployeeSearch,
} from './string-utils';

describe('string-utils', () => {
  describe('normalizeString', () => {
    it('should return empty string for null or undefined', () => {
      expect(normalizeString(null)).toBe('');
      expect(normalizeString(undefined)).toBe('');
      expect(normalizeString('')).toBe('');
    });

    it('should lowercase and strip diacritics/accents', () => {
      expect(normalizeString('ÉLÉPHANT')).toBe('elephant');
      expect(normalizeString('Jérôme Noël')).toBe('jerome noel');
      expect(normalizeString('ça va à l’école')).toBe('ca va a l’ecole');
    });
  });

  describe('includesNormalized', () => {
    it('should match case-insensitively and accent-insensitively', () => {
      expect(includesNormalized('Jérôme Dupont', 'jerome')).toBe(true);
      expect(includesNormalized('Jérôme Dupont', 'JÉRÔME')).toBe(true);
      expect(includesNormalized('Jérôme Dupont', 'pont')).toBe(true);
      expect(includesNormalized('Jean-François', 'francois')).toBe(true);
    });

    it('should return true for empty or whitespace query', () => {
      expect(includesNormalized('anything', '')).toBe(true);
      expect(includesNormalized('anything', '   ')).toBe(true);
      expect(includesNormalized('anything', null)).toBe(true);
    });

    it('should return false if target is null or does not match', () => {
      expect(includesNormalized(null, 'test')).toBe(false);
      expect(includesNormalized(undefined, 'test')).toBe(false);
      expect(includesNormalized('Alice', 'Bob')).toBe(false);
    });
  });

  describe('matchesSearch', () => {
    it('should return true if any target contains query', () => {
      expect(matchesSearch(['Alice', 'Bob', 'Charlie'], 'ali')).toBe(true);
      expect(matchesSearch(['Alice', 'Bob', 'Charlie'], 'BÔB')).toBe(true);
      expect(matchesSearch(['Alice', 'Bob', 'Charlie'], 'David')).toBe(false);
    });
  });

  describe('matchesEmployeeSearch', () => {
    const employee = {
      first_name: 'Éric',
      last_name: 'Müller',
      company_name: 'Capgemini Invent',
    };

    it('should match by last name (case & accent insensitive)', () => {
      expect(matchesEmployeeSearch(employee, 'muller')).toBe(true);
      expect(matchesEmployeeSearch(employee, 'MÜLLER')).toBe(true);
    });

    it('should match by first name (case & accent insensitive)', () => {
      expect(matchesEmployeeSearch(employee, 'eric')).toBe(true);
      expect(matchesEmployeeSearch(employee, 'ÉRIC')).toBe(true);
    });

    it('should match in both name orders: last first AND first last', () => {
      expect(matchesEmployeeSearch(employee, 'muller eric')).toBe(true);
      expect(matchesEmployeeSearch(employee, 'eric muller')).toBe(true);
      expect(matchesEmployeeSearch(employee, 'Éric Müller')).toBe(true);
    });

    it('should match by company name', () => {
      expect(matchesEmployeeSearch(employee, 'capgemini')).toBe(true);
      expect(matchesEmployeeSearch(employee, 'INVENT')).toBe(true);
    });

    it('should return false if neither name nor company matches', () => {
      expect(matchesEmployeeSearch(employee, 'Sophian')).toBe(false);
    });

    it('should return true for empty query', () => {
      expect(matchesEmployeeSearch(employee, '')).toBe(true);
      expect(matchesEmployeeSearch(employee, '  ')).toBe(true);
      expect(matchesEmployeeSearch(employee, null)).toBe(true);
    });
  });
});
