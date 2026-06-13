import { Component, inject } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, LogOut, User, Mail, Shield } from 'lucide-angular';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent {
  // Inject SupabaseService which exposes the user signal
  protected readonly supabaseService = inject(SupabaseService);
  private readonly router = inject(Router);

  // Expose icons
  readonly LogOut = LogOut;
  readonly User = User;
  readonly Mail = Mail;
  readonly Shield = Shield;

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
