import { Component, inject } from '@angular/core';
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
  LayoutDashboard
} from 'lucide-angular';
import { SidebarService } from '../../services/sidebar.service';
import { ReleaseNotesService } from '../../services/release-notes.service';
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
  private readonly releaseNotesService = inject(ReleaseNotesService);

  // Expose icons
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;
  readonly version = environment.version;

  navigationItems: NavigationItem[] = [
    { label: 'Tableau de Bord', icon: LayoutDashboard, route: '/dashboard' },
    { label: 'Collaborateurs', icon: Users, route: '/collaborateurs' },
    { label: 'Vue Mensuelle', icon: Calendar, route: '/mensuel' },
    { label: 'Vue Annuelle', icon: Layers, route: '/annuel' },
    { label: 'Mon Profil', icon: User, route: '/profile' }
  ];

  toggleSidebar() {
    this.sidebarService.toggleCollapsed();
  }

  showReleaseNotes() {
    this.releaseNotesService.openNotes();
  }
}

