import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import {
  LucideAngularModule,
  Users,
  Calendar,
  Layers,
  User,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-angular';
import { SidebarService } from '../../services/sidebar.service';
import { SupabaseService } from '../../services/supabase.service';
import { environment } from '../../../environments/environment';

interface NavigationItem {
  label: string;
  icon: any;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  protected readonly sidebarService = inject(SidebarService);
  private readonly supabaseService = inject(SupabaseService);
  private readonly router = inject(Router);

  // Expose icons
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;
  readonly LogOut = LogOut;
  readonly version = environment.version;

  navigationItems: NavigationItem[] = [
    { label: 'Collaborateurs', icon: Users, route: '/collaborateurs' },
    { label: 'Vue Mensuelle', icon: Calendar, route: '/mensuel' },
    { label: 'Vue Annuelle', icon: Layers, route: '/annuel' },
    { label: 'Mon Profil', icon: User, route: '/profile' }
  ];

  toggleSidebar() {
    this.sidebarService.toggleCollapsed();
  }

  async logout() {
    try {
      await this.supabaseService.signOut();
      this.router.navigate(['/login']);
    } catch (err) {
      console.error('Logout error:', err);
    }
  }
}
