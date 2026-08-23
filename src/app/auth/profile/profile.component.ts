import { Component, inject } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import { ThemeService, type ThemePreference } from '../../services/theme.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, LucideIconData, LogOut, User, Mail, Shield, Sun, Moon, Monitor } from 'lucide-angular';

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

  // Theme options
  readonly themeOptions: { value: ThemePreference; label: string; icon: LucideIconData }[] = [
    { value: 'light', label: 'Clair', icon: Sun },
    { value: 'dark', label: 'Sombre', icon: Moon },
    { value: 'system', label: 'Système', icon: Monitor },
  ];

  setTheme(theme: ThemePreference): void {
    this.themeService.setPreference(theme);
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
