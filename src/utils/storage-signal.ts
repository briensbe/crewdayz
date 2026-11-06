import { signal, WritableSignal, effect, inject } from '@angular/core';
import { PreferencesService } from '../app/services/preferences.service';
import { ScreenId, ScreenPreferences } from '../app/models/preferences.model';

function isColumnWidthKey(key: string): boolean {
  return key.includes('col_width');
}

export interface ScreenKeyMapping {
  screenId: ScreenId;
  prop: keyof ScreenPreferences;
}

/**
 * Maps a storage key to a screen identifier and corresponding ScreenPreferences property.
 * Returns null if the key does not correspond to a screen visual preference.
 */
export function parseScreenPreferenceKey(key: string): ScreenKeyMapping | null {
  if (key === 'crewdayz_monthly_name_display_format') {
    return { screenId: 'monthly', prop: 'nameDisplayFormat' };
  }
  if (key === 'crewdayz_annual_name_display_format') {
    return { screenId: 'annual', prop: 'nameDisplayFormat' };
  }
  if (key === 'crewdayz_employee_name_display_format') {
    return { screenId: 'employeeList', prop: 'nameDisplayFormat' };
  }

  if (key === 'crewdayz_monthly_show_columns') {
    return { screenId: 'monthly', prop: 'showExtraColumns' };
  }
  if (key === 'crewdayz_annual_show_columns') {
    return { screenId: 'annual', prop: 'showExtraColumns' };
  }

  if (key === 'crewdayz_monthly_list_sort_field') {
    return { screenId: 'monthly', prop: 'sortField' };
  }
  if (key === 'crewdayz_monthly_list_sort_direction') {
    return { screenId: 'monthly', prop: 'sortDirection' };
  }
  if (key === 'crewdayz_annual_list_sort_field') {
    return { screenId: 'annual', prop: 'sortField' };
  }
  if (key === 'crewdayz_annual_list_sort_direction') {
    return { screenId: 'annual', prop: 'sortDirection' };
  }
  if (key === 'crewdayz_employee_list_sort_field') {
    return { screenId: 'employeeList', prop: 'sortField' };
  }
  if (key === 'crewdayz_employee_list_sort_direction') {
    return { screenId: 'employeeList', prop: 'sortDirection' };
  }

  return null;
}

/**
 * Creates a WritableSignal that syncs with localStorage (and optionally with PreferencesService
 * for table column widths and screen display/sort preferences).
 *
 * @param key The storage key to use.
 * @param initialValue The initial value to use if no value is found.
 * @returns A WritableSignal initialized with the stored value or initialValue.
 */
export function storageSignal<T>(key: string, initialValue: T): WritableSignal<T> {
  let preferencesService: PreferencesService | null = null;
  try {
    preferencesService = inject(PreferencesService, { optional: true });
  } catch {
    // Outside injection context
  }

  const isColWidth = isColumnWidthKey(key);
  const screenMapping = parseScreenPreferenceKey(key);

  // Read from PreferencesService if it's a column width or a screen preference and already loaded,
  // or fallback to localStorage
  let value: T = initialValue;

  if (isColWidth && preferencesService && typeof initialValue === 'number') {
    const remoteWidth = preferencesService.getColumnWidth(key, initialValue);
    if (remoteWidth !== undefined && remoteWidth !== initialValue) {
      value = remoteWidth as unknown as T;
    }
  } else if (screenMapping && preferencesService) {
    const remotePref = preferencesService.getScreenPreference(
      screenMapping.screenId,
      screenMapping.prop
    );
    if (remotePref !== undefined && remotePref !== initialValue) {
      value = remotePref as unknown as T;
    }
  }

  // If not resolved from preferencesService, read from localStorage on initialization
  if (value === initialValue && typeof localStorage !== 'undefined') {
    const storedValue = localStorage.getItem(key);
    if (storedValue) {
      try {
        value = JSON.parse(storedValue);
      } catch (e) {
        console.warn(`Error parsing localStorage key "${key}":`, e);
      }
    }
  }

  const s = signal<T>(value);

  // Sync to PreferencesService and localStorage whenever the signal changes
  effect(() => {
    const v = s();
    if (isColWidth && preferencesService && typeof v === 'number') {
      preferencesService.setColumnWidth(key, v);
    } else if (screenMapping && preferencesService) {
      preferencesService.setScreenPreference(
        screenMapping.screenId,
        screenMapping.prop,
        v as unknown as ScreenPreferences[typeof screenMapping.prop]
      );
    }

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(v));
      }
    } catch (e) {
      console.error(`Error saving to localStorage key "${key}":`, e);
    }
  });

  // Sync from PreferencesService when remote preferences are loaded from Supabase
  if (isColWidth && preferencesService) {
    effect(() => {
      const remoteVal = preferencesService?.preferences().columnWidths?.[key];
      if (remoteVal !== undefined && remoteVal !== (s() as unknown as number)) {
        s.set(remoteVal as unknown as T);
      }
    });
  } else if (screenMapping && preferencesService) {
    effect(() => {
      const remoteVal = preferencesService?.preferences().screens?.[screenMapping.screenId]?.[screenMapping.prop];
      if (remoteVal !== undefined && remoteVal !== (s() as unknown as typeof remoteVal)) {
        s.set(remoteVal as unknown as T);
      }
    });
  }

  return s;
}
