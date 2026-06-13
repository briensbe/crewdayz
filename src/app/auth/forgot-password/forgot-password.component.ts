import { Component, inject, signal } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule, Mail, ChevronLeft } from 'lucide-angular';

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
      this.message.set('Un email de réinitialisation a été envoyé à votre adresse. Veuillez vérifier vos messages.');
      this.isError.set(false);
    } catch (error: any) {
      this.message.set(`Erreur : ${error.message || 'Impossible d\'envoyer le mail.'}`);
      this.isError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }
}
