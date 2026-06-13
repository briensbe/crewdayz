import { Component, inject, signal, OnInit } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Eye, EyeOff, Info, Lock, Mail } from 'lucide-angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  email = signal('');
  password = signal('');
  showPassword = signal(false);
  sessionExpired = signal(false);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  // Expose icons for template usage
  readonly Eye = Eye;
  readonly EyeOff = EyeOff;
  readonly Info = Info;
  readonly Lock = Lock;
  readonly Mail = Mail;

  private readonly supabaseService = inject(SupabaseService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['reason'] === 'session_expired') {
        this.sessionExpired.set(true);
      }
    });
  }

  togglePasswordVisibility() {
    this.showPassword.update((value) => !value);
  }

  async signInWithEmail() {
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      const { error } = await this.supabaseService.signInWithEmail({
        email: this.email(),
        password: this.password(),
      });
      
      if (error) {
        this.errorMessage.set(error.message);
      } else {
        // Redirect to main page or returnUrl if specified
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
        this.router.navigateByUrl(returnUrl);
      }
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Une erreur est survenue lors de la connexion.');
    } finally {
      this.loading.set(false);
    }
  }

  async signInWithGoogle() {
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      const { error } = await this.supabaseService.signInWithGoogle();
      if (error) {
        this.errorMessage.set(error.message);
      }
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Une erreur est survenue avec Google OAuth.');
    } finally {
      this.loading.set(false);
    }
  }

  navigateToSignup() {
    this.router.navigate(['/signup']);
  }

  navigateToForgot() {
    this.router.navigate(['/forgot-password']);
  }
}
