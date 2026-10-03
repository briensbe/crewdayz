import { Component, inject, effect } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SupabaseService } from './services/supabase.service';
import { JiraCollectorService } from './services/jira-collector.service';
import { ToastContainerComponent } from './shared/toast-container/toast-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ToastContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly supabaseService = inject(SupabaseService);
  private readonly router = inject(Router);
  private readonly jiraCollectorService = inject(JiraCollectorService);

  constructor() {
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
        const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password'];
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
