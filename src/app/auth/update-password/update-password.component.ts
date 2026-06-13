import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { LucideAngularModule, Eye, EyeOff, Lock, CheckCircle } from 'lucide-angular';

@Component({
  selector: 'app-update-password',
  standalone: true,
  imports: [FormsModule, CommonModule, LucideAngularModule],
  templateUrl: './update-password.component.html',
  styleUrl: './update-password.component.css',
})
export class UpdatePasswordComponent implements OnInit {
  newPassword = signal('');
  confirmPassword = signal('');
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);
  message = signal<string | null>(null);
  error = signal<string | null>(null);
  loading = signal(false);
  success = signal(false);

  // Expose icons for template
  readonly Eye = Eye;
  readonly EyeOff = EyeOff;
  readonly Lock = Lock;
  readonly CheckCircle = CheckCircle;

  private readonly supabaseService = inject(SupabaseService);
  private readonly router = inject(Router);

  async ngOnInit() {
    // Verify there is an active session (from the reset link redirect)
    const { data } = await this.supabaseService.getSession();
    if (!data.session) {
      this.error.set('Session invalide. Veuillez demander un nouveau lien de réinitialisation.');
    }
  }

  toggleNewPasswordVisibility() {
    this.showNewPassword.update((value) => !value);
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword.update((value) => !value);
  }

  async onSubmit() {
    this.error.set(null);
    this.message.set(null);

    if (this.newPassword().length < 6) {
      this.error.set('Le mot de passe doit contenir au moins 6 caractères.');
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
        this.error.set('Erreur : ' + error.message);
      } else {
        this.message.set('Mot de passe mis à jour avec succès !');
        this.success.set(true);
      }
    } catch (err: any) {
      this.error.set('Une erreur est survenue : ' + err.message);
    } finally {
      this.loading.set(false);
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
