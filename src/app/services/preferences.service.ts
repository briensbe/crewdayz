import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { environment } from '../../environments/environment';
import {
  UserPreferences,
  DEFAULT_USER_PREFERENCES,
} from '../models/preferences.model';
import { THEME_STORAGE_KEY, ThemePreference } from './theme.service';

/**
 * Utility function to perform deep equality comparison between two values.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) {
    return a === b;
  }
  if (typeof a !== 'object' || typeof b !== 'object') {
    return a === b;
  }
  if (Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(objB, key)) return false;
    if (!deepEqual(objA[key], objB[key])) return false;
  }

  return true;
}

@Injectable({
  providedIn: 'root',
})
export class PreferencesService {
  private readonly supabaseService = inject(SupabaseService);

  private readonly _preferences = signal<UserPreferences>(structuredClone(DEFAULT_USER_PREFERENCES));
  private readonly _persistedPreferences = signal<UserPreferences>(structuredClone(DEFAULT_USER_PREFERENCES));
  private readonly _isLoaded = signal<boolean>(false);

  /**
   * Reactive signal for current user preferences in memory
   */
  readonly preferences = this._preferences.asReadonly();

  /**
   * Indicates if preferences have been loaded from Supabase for current session
   */
  readonly isLoaded = this._isLoaded.asReadonly();

  /**
   * Computed boolean indicating if memory preferences differ from persisted snapshot
   */
  readonly isDirty = computed<boolean>(() => !deepEqual(this._preferences(), this._persistedPreferences()));

  private destroyListeners?: () => void;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.setupLifecycleListeners();
    this.setupAuthSync();
  }

  private currentUserId: string | null = null;

  /**
   * Synchronize preferences loading when the authenticated user changes
   */
  private setupAuthSync() {
    this.supabaseService?.registerBeforeSignOut?.(async () => {
      await this.flush();
    });

    effect(() => {
      const user = this.supabaseService?.user ? this.supabaseService.user() : null;
      if (user) {
        if (this.currentUserId !== user.id) {
          this.loadPreferences(user.id);
        }
      } else {
        this.currentUserId = null;
        this.resetToDefaults();
      }
    });
  }

  /**
   * Setup browser lifecycle listeners (visibilitychange, pagehide) for event-driven flush
   */
  private setupLifecycleListeners() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        this.flush(true);
      }
    };

    const onPageHide = () => {
      this.flush(true);
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);

    this.destroyListeners = () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
    };
  }

  /**
   * Clean up lifecycle listeners (mainly for unit tests)
   */
  destroy() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.destroyListeners) {
      this.destroyListeners();
    }
  }

  /**
   * Load user preferences from Supabase `crewdayz.cd_user_preferences`
   */
  async loadPreferences(userId: string): Promise<void> {
    this.currentUserId = userId;
    try {
      if (!this.supabaseService?.client?.from) {
        return;
      }
      const { data, error } = await this.supabaseService.client
        .from('cd_user_preferences')
        .select('preferences')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Could not load user preferences from Supabase:', error);
        return;
      }

      if (data?.preferences && typeof data.preferences === 'object') {
        const remotePrefs = data.preferences as UserPreferences;
        const merged: UserPreferences = {
          ...DEFAULT_USER_PREFERENCES,
          ...remotePrefs,
          columnWidths: {
            ...DEFAULT_USER_PREFERENCES.columnWidths,
            ...(remotePrefs.columnWidths || {}),
          },
          releaseNotes: {
            ...DEFAULT_USER_PREFERENCES.releaseNotes,
            ...(remotePrefs.releaseNotes || {}),
          },
        };

        this._preferences.set(merged);
        this._persistedPreferences.set(structuredClone(merged));
        this.syncLocalCache(merged);
      } else {
        // First login or no preferences record yet: set baseline to current memory state
        this._persistedPreferences.set(structuredClone(this._preferences()));
      }

      this._isLoaded.set(true);
    } catch (err) {
      console.error('Unexpected error loading preferences:', err);
    }
  }

  /**
   * Schedule a debounced flush (1.5s) to persist consolidated changes in background
   */
  scheduleDebouncedFlush(delayMs = 1500) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.flush();
    }, delayMs);
  }

  /**
   * Update theme preference
   */
  setTheme(theme: ThemePreference) {
    if (this._preferences().theme === theme) {
      return;
    }
    this._preferences.update((current) => ({
      ...current,
      theme,
    }));
    this.syncThemeLocalCache(theme);
    this.scheduleDebouncedFlush();
  }

  /**
   * Update a column width for a table
   */
  setColumnWidth(key: string, width: number) {
    if (this._preferences().columnWidths?.[key] === width) {
      return;
    }
    this._preferences.update((current) => ({
      ...current,
      columnWidths: {
        ...(current.columnWidths || {}),
        [key]: width,
      },
    }));
    this.scheduleDebouncedFlush();
  }

  /**
   * Get a column width by key with fallback
   */
  getColumnWidth(key: string, defaultWidth: number): number {
    return this._preferences().columnWidths?.[key] ?? defaultWidth;
  }

  /**
   * Mark release notes version as seen
   */
  setLastSeenReleaseNotesVersion(version: string) {
    if (this._preferences().releaseNotes?.lastSeenVersion === version) {
      return;
    }
    this._preferences.update((current) => ({
      ...current,
      releaseNotes: {
        ...(current.releaseNotes || {}),
        lastSeenVersion: version,
      },
    }));
    this.scheduleDebouncedFlush();
  }

  /**
   * Flush in-memory preferences to Supabase if dirty
   */
  async flush(useKeepalive = false): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (!this.isDirty()) {
      return;
    }

    const user = this.supabaseService.user();
    if (!user || !this.supabaseService?.client?.from) {
      return;
    }

    const payload = structuredClone(this._preferences());

    // Tab close / unload fallback: use keepalive fetch so the browser doesn't abort
    if (useKeepalive && typeof window !== 'undefined' && typeof window.fetch === 'function') {
      this.flushWithKeepalive(user.id, payload);
      this._persistedPreferences.set(structuredClone(payload));
      return;
    }

    try {
      const { error } = await this.supabaseService.client
        .from('cd_user_preferences')
        .upsert(
          {
            user_id: user.id,
            preferences: payload,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('[Preferences] Error saving user preferences to Supabase:', error);
      } else {
        this._persistedPreferences.set(structuredClone(payload));
      }
    } catch (err) {
      console.error('[Preferences] Unexpected error during preferences flush:', err);
    }
  }

  private flushWithKeepalive(userId: string, payload: UserPreferences) {
    try {
      const token = this.supabaseService.accessToken || environment.supabaseKey;
      const url = `${environment.supabaseUrl}/rest/v1/cd_user_preferences?on_conflict=user_id`;
      fetch(url, {
        method: 'POST',
        headers: {
          'apikey': environment.supabaseKey,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          user_id: userId,
          preferences: payload,
          updated_at: new Date().toISOString(),
        }),
        keepalive: true,
      }).catch((err) => {
        console.warn('[Preferences] keepalive fetch error on unload:', err);
      });
    } catch (e) {
      console.warn('[Preferences] keepalive flush exception:', e);
    }
  }

  /**
   * Reset in-memory preferences to default (on logout)
   */
  private resetToDefaults() {
    this._preferences.set(structuredClone(DEFAULT_USER_PREFERENCES));
    this._persistedPreferences.set(structuredClone(DEFAULT_USER_PREFERENCES));
    this._isLoaded.set(false);
  }

  /**
   * Synchronize anti-flicker cache for the initial unauthenticated boot
   */
  private syncLocalCache(prefs: UserPreferences) {
    if (prefs.theme) {
      this.syncThemeLocalCache(prefs.theme);
    }
  }

  private syncThemeLocalCache(theme: ThemePreference) {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch (e) {
        console.warn('Could not update localStorage theme cache', e);
      }
    }
  }
}
