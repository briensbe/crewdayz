import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ProfileComponent } from './profile.component';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('ProfileComponent', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let component: ProfileComponent;
  let mockUserSignal: any;
  let mockRoleSignal: any;
  let mockSupabaseService: any;
  let mockToastService: any;
  let mockRouter: any;

  beforeEach(async () => {
    mockUserSignal = signal({
      id: '123',
      email: 'test@example.com',
      user_metadata: { displayName: 'John Doe' },
    });
    mockRoleSignal = signal('editor');

    mockSupabaseService = {
      user: mockUserSignal,
      userRole: mockRoleSignal,
      updateDisplayName: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: vi.fn().mockResolvedValue(undefined),
    };

    mockToastService = {
      success: vi.fn(),
      error: vi.fn(),
    };

    mockRouter = {
      navigate: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: ToastService, useValue: mockToastService },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create ProfileComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should compute the current display name', () => {
    expect(component.currentDisplayName()).toBe('John Doe');
  });

  it('should start and cancel display name editing', () => {
    expect(component.isEditingName()).toBe(false);
    component.startEditingName();
    expect(component.isEditingName()).toBe(true);
    expect(component.editDisplayName()).toBe('John Doe');

    component.cancelEditingName();
    expect(component.isEditingName()).toBe(false);
  });

  it('should validate empty display name', async () => {
    component.startEditingName();
    component.onNameChange('   ');
    await component.saveDisplayName();

    expect(component.nameError()).toBe('Le nom d’affichage ne peut pas être vide.');
    expect(mockSupabaseService.updateDisplayName).not.toHaveBeenCalled();
  });

  it('should not call update if display name did not change', async () => {
    component.startEditingName();
    component.onNameChange('John Doe');
    await component.saveDisplayName();

    expect(mockSupabaseService.updateDisplayName).not.toHaveBeenCalled();
    expect(component.isEditingName()).toBe(false);
  });

  it('should update display name and show success toast', async () => {
    component.startEditingName();
    component.onNameChange('Jane Doe');
    await component.saveDisplayName();

    expect(mockSupabaseService.updateDisplayName).toHaveBeenCalledWith('Jane Doe');
    expect(mockToastService.success).toHaveBeenCalledWith('Nom d’affichage mis à jour avec succès.');
    expect(component.isEditingName()).toBe(false);
  });

  it('should handle update error gracefully', async () => {
    mockSupabaseService.updateDisplayName.mockRejectedValue(new Error('Network error'));
    component.startEditingName();
    component.onNameChange('Jane Doe');
    await component.saveDisplayName();

    expect(mockSupabaseService.updateDisplayName).toHaveBeenCalledWith('Jane Doe');
    expect(component.nameError()).toBe('Network error');
    expect(mockToastService.error).toHaveBeenCalledWith('Network error');
    expect(component.isEditingName()).toBe(true);
  });
});
