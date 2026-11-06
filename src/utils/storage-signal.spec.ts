import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { storageSignal, parseScreenPreferenceKey } from './storage-signal';
import { PreferencesService } from '../app/services/preferences.service';
import { signal, WritableSignal } from '@angular/core';
import {
  UserPreferences,
  DEFAULT_USER_PREFERENCES,
  ScreenId,
  ScreenPreferences,
} from '../app/models/preferences.model';

describe('parseScreenPreferenceKey', () => {
  it('should map monthly name display format key', () => {
    expect(parseScreenPreferenceKey('crewdayz_monthly_name_display_format')).toEqual({
      screenId: 'monthly',
      prop: 'nameDisplayFormat',
    });
  });

  it('should map annual extra columns key', () => {
    expect(parseScreenPreferenceKey('crewdayz_annual_show_columns')).toEqual({
      screenId: 'annual',
      prop: 'showExtraColumns',
    });
  });

  it('should map employee sort field and direction keys', () => {
    expect(parseScreenPreferenceKey('crewdayz_employee_list_sort_field')).toEqual({
      screenId: 'employeeList',
      prop: 'sortField',
    });
    expect(parseScreenPreferenceKey('crewdayz_employee_list_sort_direction')).toEqual({
      screenId: 'employeeList',
      prop: 'sortDirection',
    });
  });

  it('should return null for non-screen keys', () => {
    expect(parseScreenPreferenceKey('crewdayz_theme')).toBeNull();
    expect(parseScreenPreferenceKey('crewdayz_annual_name_col_width')).toBeNull();
  });
});

describe('storageSignal integration with PreferencesService', () => {
  let mockPreferencesSignal: WritableSignal<UserPreferences>;
  let mockPreferencesService: {
    preferences: () => UserPreferences;
    getScreenPreference: ReturnType<typeof vi.fn>;
    setScreenPreference: ReturnType<typeof vi.fn>;
    getColumnWidth: ReturnType<typeof vi.fn>;
    setColumnWidth: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    localStorage.clear();
    mockPreferencesSignal = signal<UserPreferences>({
      ...DEFAULT_USER_PREFERENCES,
      screens: {
        monthly: {
          nameDisplayFormat: 'first_last',
          showExtraColumns: false,
        },
      },
    });

    mockPreferencesService = {
      preferences: () => mockPreferencesSignal(),
      getScreenPreference: vi.fn((screenId: ScreenId, prop: keyof ScreenPreferences) => {
        return mockPreferencesSignal().screens?.[screenId]?.[prop];
      }),
      setScreenPreference: vi.fn(),
      getColumnWidth: vi.fn(),
      setColumnWidth: vi.fn(),
    };
  });

  it('should initialize value from PreferencesService when present', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: PreferencesService, useValue: mockPreferencesService },
      ],
    });

    TestBed.runInInjectionContext(() => {
      const s = storageSignal<'last_first' | 'first_last'>(
        'crewdayz_monthly_name_display_format',
        'last_first'
      );
      expect(s()).toBe('first_last');
    });
  });

  it('should notify PreferencesService when screen signal changes', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: PreferencesService, useValue: mockPreferencesService },
      ],
    });

    TestBed.runInInjectionContext(() => {
      const s = storageSignal<boolean>('crewdayz_monthly_show_columns', true);
      s.set(false);
      TestBed.flushEffects();

      expect(mockPreferencesService.setScreenPreference).toHaveBeenCalledWith(
        'monthly',
        'showExtraColumns',
        false
      );
      expect(JSON.parse(localStorage.getItem('crewdayz_monthly_show_columns')!)).toBe(false);
    });
  });
});
