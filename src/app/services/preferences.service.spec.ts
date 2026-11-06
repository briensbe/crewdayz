import '@angular/compiler';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { PreferencesService, deepEqual } from './preferences.service';
import { SupabaseService } from './supabase.service';
import { DEFAULT_USER_PREFERENCES } from '../models/preferences.model';
import { User } from '@supabase/supabase-js';

describe('deepEqual', () => {
  it('should compare primitives correctly', () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual(1, 2)).toBe(false);
    expect(deepEqual('a', 'a')).toBe(true);
    expect(deepEqual('a', 'b')).toBe(false);
    expect(deepEqual(true, true)).toBe(true);
    expect(deepEqual(true, false)).toBe(false);
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(undefined, undefined)).toBe(true);
    expect(deepEqual(null, undefined)).toBe(false);
  });

  it('should compare arrays correctly', () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
  });

  it('should compare nested objects correctly', () => {
    const objA = { a: 1, b: { c: 'hello', d: [1, 2] } };
    const objB = { a: 1, b: { c: 'hello', d: [1, 2] } };
    const objC = { a: 1, b: { c: 'world', d: [1, 2] } };
    const objD = { a: 1, b: { c: 'hello', d: [1, 3] } };

    expect(deepEqual(objA, objB)).toBe(true);
    expect(deepEqual(objA, objC)).toBe(false);
    expect(deepEqual(objA, objD)).toBe(false);
  });
});

describe('PreferencesService', () => {
  let service: PreferencesService;
  let userSignal: WritableSignal<User | null>;
  let beforeSignOutCallback: (() => Promise<void>) | null = null;
  let mockUpsert: ReturnType<typeof vi.fn>;
  let mockMaybeSingle: ReturnType<typeof vi.fn>;
  let mockEq: ReturnType<typeof vi.fn>;
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockFrom: ReturnType<typeof vi.fn>;

  const mockUser: User = {
    id: 'user-uuid-123',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '',
  };

  beforeEach(() => {
    userSignal = signal<User | null>(null);
    beforeSignOutCallback = null;

    mockUpsert = vi.fn().mockResolvedValue({ error: null });
    mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom = vi.fn((table: string) => {
      if (table === 'cd_user_preferences') {
        return {
          select: mockSelect,
          upsert: mockUpsert,
        };
      }
      return {};
    });

    const mockSupabaseService = {
      registerBeforeSignOut: vi.fn((cb: () => Promise<void>) => {
        beforeSignOutCallback = cb;
      }),
      user: userSignal,
      client: {
        from: mockFrom,
      },
    };

    TestBed.configureTestingModule({
      providers: [
        PreferencesService,
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    });

    service = TestBed.inject(PreferencesService);
  });

  afterEach(() => {
    service.destroy();
  });

  it('should initialize with default preferences and not be dirty', () => {
    expect(service.preferences()).toEqual(DEFAULT_USER_PREFERENCES);
    expect(service.isDirty()).toBe(false);
  });

  it('should mark dirty when a preference is updated, and reset dirty if restored', () => {
    service.setTheme('dark');
    expect(service.isDirty()).toBe(true);
    expect(service.preferences().theme).toBe('dark');

    // Restoring to default 'system'
    service.setTheme('system');
    expect(service.isDirty()).toBe(false);
  });

  it('should update column widths correctly', () => {
    service.setColumnWidth('annual_col_width', 220);
    expect(service.getColumnWidth('annual_col_width', 150)).toBe(220);
    expect(service.getColumnWidth('unknown_col', 100)).toBe(100);
    expect(service.isDirty()).toBe(true);
  });

  it('should not mark dirty if column width is set to the same value', () => {
    service.setColumnWidth('annual_col_width', 220);
    expect(service.isDirty()).toBe(true);
    // Fake flush to clean dirty state
    service['_persistedPreferences'].set(structuredClone(service.preferences()));
    expect(service.isDirty()).toBe(false);

    // Set same value
    service.setColumnWidth('annual_col_width', 220);
    expect(service.isDirty()).toBe(false);
  });

  it('should update release notes version', () => {
    service.setLastSeenReleaseNotesVersion('2.4.0');
    expect(service.preferences().releaseNotes?.lastSeenVersion).toBe('2.4.0');
    expect(service.isDirty()).toBe(true);
  });

  it('should not call Supabase flush if isDirty is false', async () => {
    userSignal.set(mockUser);
    await service.flush();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('should not call Supabase flush if no user is authenticated', async () => {
    service.setTheme('dark');
    expect(service.isDirty()).toBe(true);
    await service.flush();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('should call Supabase flush when dirty and user authenticated, then reset dirty', async () => {
    userSignal.set(mockUser);
    await service.loadPreferences(mockUser.id);

    service.setTheme('dark');
    expect(service.isDirty()).toBe(true);

    await service.flush();

    expect(mockUpsert).toHaveBeenCalled();
    const callArgs = mockUpsert.mock.calls[0][0];
    expect(callArgs.user_id).toBe('user-uuid-123');
    expect(callArgs.preferences.theme).toBe('dark');
    expect(service.isDirty()).toBe(false);
  });

  it('should load remote preferences and establish baseline', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        preferences: {
          theme: 'dark',
          columnWidths: { test_col: 180 },
        },
      },
      error: null,
    });

    await service.loadPreferences('user-uuid-123');

    expect(service.preferences().theme).toBe('dark');
    expect(service.getColumnWidth('test_col', 100)).toBe(180);
    expect(service.isLoaded()).toBe(true);
    expect(service.isDirty()).toBe(false);
  });

  it('should trigger flush via registered beforeSignOut callback', async () => {
    userSignal.set(mockUser);
    await service.loadPreferences(mockUser.id);

    service.setTheme('light');
    expect(service.isDirty()).toBe(true);

    expect(beforeSignOutCallback).not.toBeNull();
    if (beforeSignOutCallback) {
      await (beforeSignOutCallback as () => Promise<void>)();
    }

    expect(mockUpsert).toHaveBeenCalled();
    expect(service.isDirty()).toBe(false);
  });
});
