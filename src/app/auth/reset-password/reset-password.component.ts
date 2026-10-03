import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import {
  LucideAngularModule,
  Eye,
  EyeOff,
  Lock,
  CheckCircle,
  Mail,
  KeyRound,
  RefreshCw,
  ChevronLeft,
} from 'lucide-angular';
import { environment } from '../../../environments/environment';
import { getEmailPlaceholder } from '../../../utils/email-validator';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, CommonModule, LucideAngularModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css',
})
export class ResetPasswordComponent implements OnInit {
  email = signal('');
  otpCode = signal('');
  newPassword = signal('');
  confirmPassword = signal('');
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);
  error = signal<string | null>(null);
  resendSuccess = signal<string | null>(null);
  loading = signal(false);
  resending = signal(false);
  success = signal(false);

  emailPlaceholder = computed(() => getEmailPlaceholder(environment.allowedEmailDomains));

  // Expose icons for template
  readonly Eye = Eye;
  readonly EyeOff = EyeOff;
  readonly Lock = Lock;
  readonly CheckCircle = CheckCircle;
  readonly Mail = Mail;
  readonly KeyRound = KeyRound;
  readonly RefreshCw = RefreshCw;
  readonly ChevronLeft = ChevronLeft;

  protected readonly supabaseService = inject(SupabaseService);
  private readonly router = inject(Router);

  ngOnInit() {
    // Retrieve email pre-filled from navigation state if available
    const navState = history.state;
    if (navState?.email && typeof navState.email === 'string') {
      this.email.set(navState.email);
    }
  }

  toggleNewPasswordVisibility() {
    this.showNewPassword.update((value) => !value);
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword.update((value) => !value);
  }

  onEmailChange(value: string) {
    this.email.set(value);
    this.clearAlerts();
  }

  onOtpCodeChange(value: string) {
    // Keep only numeric characters and max 6 digits
    const cleanValue = value.replace(/\D/g, '').slice(0, 6);
    this.otpCode.set(cleanValue);
    this.clearAlerts();
  }

  onNewPasswordChange(value: string) {
    this.newPassword.set(value);
    this.clearAlerts();
  }

  onConfirmPasswordChange(value: string) {
    this.confirmPassword.set(value);
    this.clearAlerts();
  }

  private clearAlerts() {
    if (this.error()) this.error.set(null);
    if (this.resendSuccess()) this.resendSuccess.set(null);
  }

  async onResendCode() {
    if (!this.email().trim()) {
      this.error.set('Veuillez renseigner votre adresse e-mail pour renvoyer un code.');
      return;
    }

    this.resending.set(true);
    this.clearAlerts();

    try {
      await this.supabaseService.resetPasswordForEmail(this.email().trim());
      this.resendSuccess.set('Un nouveau code à 6 chiffres a été envoyé à votre adresse e-mail.');
    } catch (err: any) {
      this.error.set(err?.message || "Erreur lors de l'envoi du nouveau code.");
    } finally {
      this.resending.set(false);
    }
  }

  async onSubmit() {
    this.clearAlerts();

    if (!this.email().trim()) {
      this.error.set('Veuillez renseigner votre adresse e-mail.');
      return;
    }

    if (this.otpCode().trim().length !== 6) {
      this.error.set('Veuillez saisir le code de confirmation complet à 6 chiffres.');
      return;
    }

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
      await this.supabaseService.resetPasswordWithOtp(
        this.email().trim(),
        this.otpCode().trim(),
        this.newPassword(),
      );
      this.success.set(true);
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
    if (msg.includes('Token has expired') || msg.includes('invalide ou expiré')) {
      return 'Le code de confirmation est incorrect ou a expiré (validité 10 min). Veuillez utiliser le dernier code reçu ou en demander un nouveau.';
    }
    return 'Erreur : ' + msg;
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
