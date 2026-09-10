import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideAngularModule,
  Users,
  Calendar,
  Layers,
  User,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Umbrella,
  History,
  MessageSquare,
  FileSpreadsheet,
  Sun,
  Moon,
} from 'lucide-angular';
import { SidebarService } from '../../services/sidebar.service';
import { ReleaseNotesService } from '../../services/release-notes.service';
import { ThemeService } from '../../services/theme.service';
import { SupabaseService } from '../../services/supabase.service';
import { UserRole } from '../../models/types';
import { environment } from '../../../environments/environment';

interface NavigationItem {
  label: string;
  icon: any;
  route: string;
  roles?: UserRole[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  protected readonly sidebarService = inject(SidebarService);
  public readonly themeService = inject(ThemeService);
  private readonly releaseNotesService = inject(ReleaseNotesService);
  protected readonly supabaseService = inject(SupabaseService);

  // Expose icons
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;
  readonly Sun = Sun;
  readonly Moon = Moon;
  readonly version = environment.version;

  private readonly allNavigationItems: NavigationItem[] = [
    { label: 'Tableau de Bord', icon: LayoutDashboard, route: '/dashboard', roles: ['editor', 'admin'] },
    { label: 'Collaborateurs', icon: Users, route: '/collaborateurs', roles: ['editor', 'admin'] },
    { label: 'Vue Mensuelle', icon: Calendar, route: '/mensuel' },
    { label: 'Vue Annuelle', icon: Layers, route: '/annuel' },
    { label: 'Rapprochement Triskell', icon: FileSpreadsheet, route: '/reconciliation', roles: ['editor', 'admin'] },
    { label: 'Vacances Scolaires', icon: Umbrella, route: '/vacances' },
    { label: "Historique d'Audit", icon: History, route: '/audit', roles: ['admin'] },
    { label: 'Suggestions', icon: MessageSquare, route: '/suggestions' },
    { label: 'Mon Profil', icon: User, route: '/profile' },
  ];

  readonly navigationItems = computed(() => {
    const currentRole = this.supabaseService.userRole();
    return this.allNavigationItems.filter((item) => {
      if (!item.roles) return true;
      return item.roles.includes(currentRole);
    });
  });

  toggleSidebar() {
    this.sidebarService.toggleCollapsed();
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  showReleaseNotes() {
    this.releaseNotesService.openNotes();
  }
}
