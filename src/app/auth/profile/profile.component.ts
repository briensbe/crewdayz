import { Component, computed, inject } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import { ThemeService, type ThemePreference } from '../../services/theme.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
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
} from 'lucide-angular';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent {
  // Inject services
  protected readonly supabaseService = inject(SupabaseService);
  public readonly themeService = inject(ThemeService);
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
      alert('Erreur lors de la déconnexion.');
    }
  }
}
