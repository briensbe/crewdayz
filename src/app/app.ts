import { Component, inject, effect } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { SidebarService } from './services/sidebar.service';
import { SupabaseService } from './services/supabase.service';
import { ReleaseNotesComponent } from './shared/release-notes/release-notes.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, ReleaseNotesComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly sidebarService = inject(SidebarService);
  protected readonly supabaseService = inject(SupabaseService);
  private readonly router = inject(Router);

  constructor() {
    // Watch for authentication changes globally
    effect(() => {
      const user = this.supabaseService.user();
      if (!user) {
        const currentUrl = this.router.url;
        const publicRoutes = ['/login', '/signup', '/forgot-password', '/update-password'];
        const isPublic = publicRoutes.some(route => currentUrl.includes(route));

        // Redirect to login only if on a protected route
        if (!isPublic && currentUrl !== '/' && currentUrl !== '') {
          const queryParams = this.supabaseService.isLocalLogout ? {} : { reason: 'session_expired' };
          this.router.navigate(['/login'], { queryParams });
        }
      }
    });
  }
}
