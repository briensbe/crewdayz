import { Component, computed, inject, signal } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule, Mail, ChevronLeft } from 'lucide-angular';
import { environment } from '../../../environments/environment';
import { getEmailPlaceholder } from '../../../utils/email-validator';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, CommonModule, LucideAngularModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css',
})
export class ForgotPasswordComponent {
  email = signal('');
  message = signal<string | null>(null);
  isError = signal(false);
  loading = signal(false);

  emailPlaceholder = computed(() => getEmailPlaceholder(environment.allowedEmailDomains));

  // Expose icons for template
  readonly Mail = Mail;
  readonly ChevronLeft = ChevronLeft;

  private readonly supabaseService = inject(SupabaseService);
  private readonly router = inject(Router);

  async onSubmit() {
    if (!this.email()) {
      this.message.set('Veuillez saisir votre adresse email.');
      this.isError.set(true);
      return;
    }

    this.loading.set(true);
    this.message.set(null);
    this.isError.set(false);

    try {
      await this.supabaseService.resetPasswordForEmail(this.email());
      // Navigate to /reset-password passing email in state
      await this.router.navigate(['/reset-password'], {
        state: { email: this.email() },
      });
    } catch (error: any) {
      this.message.set(`Erreur : ${error.message || "Impossible d'envoyer le code de réinitialisation."}`);
      this.isError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }
}
