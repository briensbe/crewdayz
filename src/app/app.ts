import { Component, inject, effect } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { SidebarService } from './services/sidebar.service';
import { SupabaseService } from './services/supabase.service';
import { ReleaseNotesComponent } from './shared/release-notes/release-notes.component';
import { JiraCollectorService } from './services/jira-collector.service';
import { ToastContainerComponent } from './shared/toast-container/toast-container.component';
import { ToastService } from './services/toast.service';
 
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, ReleaseNotesComponent, ToastContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly sidebarService = inject(SidebarService);
  protected readonly supabaseService = inject(SupabaseService);
  private readonly router = inject(Router);
  private readonly jiraCollectorService = inject(JiraCollectorService);
  // private readonly toastService = inject(ToastService);

  constructor() {
    // Tests de bon fonctionnement du Toaster
    // this.toastService.success('Système de notifications initialisé avec succès !');
    // this.toastService.warning('Avertissement : Les tests de toaster sont actifs.');
    // this.toastService.error('Ceci est un test de message d\'erreur.');

    // Watch for authentication changes globally
    effect(() => {
      const user = this.supabaseService.user();
      if (user) {
        // Load Jira issue collector for authenticated users
        this.jiraCollectorService.loadAndShow().catch((err) => {
          console.warn('Jira Issue Collector load failed:', err);
        });
      } else {
        const currentUrl = this.router.url;
        const publicRoutes = ['/login', '/signup', '/forgot-password', '/update-password'];
        const isPublic = publicRoutes.some((route) => currentUrl.includes(route));

        // Redirect to login only if on a protected route
        if (!isPublic && currentUrl !== '/' && currentUrl !== '') {
          const queryParams = this.supabaseService.isLocalLogout ? {} : { reason: 'session_expired' };
          this.router.navigate(['/login'], { queryParams });
        }
      }
    });
  }
}
