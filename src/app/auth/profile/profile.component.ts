import { Component, computed, inject, signal } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import { ThemeService, type ThemePreference } from '../../services/theme.service';
import { ToastService } from '../../services/toast.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  LucideIconData,
  LogOut,
  User,
  Mail,
  Shield,
  Sun,
  Moon,
  Monitor,
  Globe,
  Lock,
  KeyRound,
  ShieldCheck,
  Pencil,
  Check,
  X,
  Loader2,
} from 'lucide-angular';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent {
  // Inject services
  protected readonly supabaseService = inject(SupabaseService);
  public readonly themeService = inject(ThemeService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  // Expose icons
  readonly LogOut = LogOut;
  readonly User = User;
  readonly Mail = Mail;
  readonly Shield = Shield;
  readonly Globe = Globe;
  readonly Lock = Lock;
  readonly KeyRound = KeyRound;
  readonly ShieldCheck = ShieldCheck;
  readonly Pencil = Pencil;
  readonly Check = Check;
  readonly X = X;
  readonly Loader2 = Loader2;

  // Display Name editing states
  readonly isEditingName = signal(false);
  readonly isSavingName = signal(false);
  readonly editDisplayName = signal('');
  readonly nameError = signal<string | null>(null);

  readonly currentDisplayName = computed(() => {
    const user = this.supabaseService.user();
    return (
      user?.user_metadata?.['displayName'] ||
      user?.user_metadata?.['full_name'] ||
      user?.user_metadata?.['name'] ||
      ''
    );
  });

  readonly isGoogleUser = computed(() => {
    const user = this.supabaseService.user();
    if (!user) return false;
    const provider = user.app_metadata?.['provider'];
    const providers = user.app_metadata?.['providers'];
    return provider === 'google' || (Array.isArray(providers) && providers.includes('google'));
  });

  readonly authProviderLabel = computed(() => {
    return this.isGoogleUser() ? 'Compte Google' : 'Email et mot de passe';
  });

  readonly roleLabel = computed(() => {
    const role = this.supabaseService.userRole();
    switch (role) {
      case 'admin':
        return 'Administrateur';
      case 'editor':
        return 'Éditeur';
      case 'viewer':
      default:
        return 'Consultation (Lecture seule)';
    }
  });

  readonly roleDescription = computed(() => {
    const role = this.supabaseService.userRole();
    switch (role) {
      case 'admin':
        return "Accès complet à toutes les vues, à la gestion et à l'historique d'audit.";
      case 'editor':
        return "Création et modification des absences, collaborateurs et plannings.";
      case 'viewer':
      default:
        return "Consultation des plannings mensuel et annuel (modifications désactivées).";
    }
  });

  // Theme options
  readonly themeOptions: { value: ThemePreference; label: string; icon: LucideIconData }[] = [
    { value: 'light', label: 'Clair', icon: Sun },
    { value: 'dark', label: 'Sombre', icon: Moon },
    { value: 'system', label: 'Système', icon: Monitor },
  ];

  startEditingName(): void {
    this.editDisplayName.set(this.currentDisplayName());
    this.nameError.set(null);
    this.isEditingName.set(true);
  }

  cancelEditingName(): void {
    this.isEditingName.set(false);
    this.nameError.set(null);
  }

  onNameChange(value: string): void {
    this.editDisplayName.set(value);
    if (this.nameError()) {
      this.nameError.set(null);
    }
  }

  async saveDisplayName(): Promise<void> {
    const trimmed = this.editDisplayName().trim();
    if (!trimmed) {
      this.nameError.set('Le nom d’affichage ne peut pas être vide.');
      return;
    }

    if (trimmed === this.currentDisplayName()) {
      this.isEditingName.set(false);
      return;
    }

    this.isSavingName.set(true);
    this.nameError.set(null);

    try {
      await this.supabaseService.updateDisplayName(trimmed);
      this.toastService.success('Nom d’affichage mis à jour avec succès.');
      this.isEditingName.set(false);
    } catch (error: any) {
      const message = error.message || 'Erreur lors de la mise à jour du nom d’affichage.';
      this.nameError.set(message);
      this.toastService.error(message);
    } finally {
      this.isSavingName.set(false);
    }
  }

  setTheme(theme: ThemePreference): void {
    this.themeService.setPreference(theme);
  }

  goToUpdatePassword(): void {
    this.router.navigate(['/update-password']);
  }

  async logout() {
    try {
      await this.supabaseService.signOut();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout error:', error);
      this.toastService.error('Erreur lors de la déconnexion.');
    }
  }
}
