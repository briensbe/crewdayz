import { signal, WritableSignal, effect, inject } from '@angular/core';
import { PreferencesService } from '../app/services/preferences.service';

function isColumnWidthKey(key: string): boolean {
  return key.includes('col_width');
}

/**
 * Creates a WritableSignal that syncs with localStorage (and optionally with PreferencesService for table column widths).
 * Filters, sorts, and volatile view preferences remain exclusively managed in localStorage / memory without remote DB persistence.
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

  // Read from PreferencesService if it's a column width and already loaded, or fallback to localStorage
  let value: T = initialValue;

  if (isColWidth && preferencesService && typeof initialValue === 'number') {
    const remoteWidth = preferencesService.getColumnWidth(key, initialValue);
    if (remoteWidth !== undefined && remoteWidth !== initialValue) {
      value = remoteWidth as unknown as T;
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

  // Sync to PreferencesService (column widths only) and localStorage whenever the signal changes
  effect(() => {
    const v = s();
    if (isColWidth && preferencesService && typeof v === 'number') {
      preferencesService.setColumnWidth(key, v);
    }
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(v));
      }
    } catch (e) {
      console.error(`Error saving to localStorage key "${key}":`, e);
    }
  });

  // Sync from PreferencesService when remote preferences are loaded from Supabase (column widths only)
  if (isColWidth && preferencesService) {
    effect(() => {
      const remoteVal = preferencesService?.preferences().columnWidths?.[key];
      if (remoteVal !== undefined && remoteVal !== (s() as unknown as number)) {
        s.set(remoteVal as unknown as T);
      }
    });
  }

  return s;
}
