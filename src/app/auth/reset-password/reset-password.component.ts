import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { LucideAngularModule, Eye, EyeOff, Lock, CheckCircle } from 'lucide-angular';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, CommonModule, LucideAngularModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css',
})
export class ResetPasswordComponent implements OnInit {
  newPassword = signal('');
  confirmPassword = signal('');
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);
  error = signal<string | null>(null);
  loading = signal(false);
  success = signal(false);

  // Expose icons for template
  readonly Eye = Eye;
  readonly EyeOff = EyeOff;
  readonly Lock = Lock;
  readonly CheckCircle = CheckCircle;

  protected readonly supabaseService = inject(SupabaseService);
  private readonly router = inject(Router);

  async ngOnInit() {
    // Verify there is an active session from the recovery link redirect
    const { data } = await this.supabaseService.getSession();
    if (!data.session && !this.supabaseService.user()) {
      this.error.set('Session invalide ou expirée. Veuillez demander un nouveau lien de réinitialisation.');
    }
  }

  toggleNewPasswordVisibility() {
    this.showNewPassword.update((value) => !value);
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword.update((value) => !value);
  }

  onNewPasswordChange(value: string) {
    this.newPassword.set(value);
    if (this.error()) this.error.set(null);
  }

  onConfirmPasswordChange(value: string) {
    this.confirmPassword.set(value);
    if (this.error()) this.error.set(null);
  }

  async onSubmit() {
    this.error.set(null);

    if (this.newPassword().length < 6) {
      this.error.set('Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (this.newPassword() !== this.confirmPassword()) {
      this.error.set('Les mots de passe ne correspondent pas.');
      return;
    }

    this.loading.set(true);

    try {
      const { error } = await this.supabaseService.updatePassword(this.newPassword());

      if (error) {
        this.error.set(this.formatErrorMessage(error));
      } else {
        this.success.set(true);
      }
    } catch (err: any) {
      this.error.set(this.formatErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  private formatErrorMessage(err: any): string {
    const msg = err?.message || String(err || '');
    if (msg.includes('different from the old password')) {
      return 'Le nouveau mot de passe doit être différent de l’ancien mot de passe.';
    }
    if (msg.includes('should be at least 6 characters')) {
      return 'Le mot de passe doit contenir au moins 6 caractères.';
    }
    return 'Erreur : ' + msg;
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
