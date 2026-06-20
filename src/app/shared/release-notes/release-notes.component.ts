import { Component, OnInit, OnDestroy, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ReleaseNotesService } from '../../services/release-notes.service';
import { SupabaseService } from '../../services/supabase.service';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

interface ReleaseNews {
  title: string;
  imageUrl?: string;
  imageMaxHeight?: number;
  items: string[];
}

interface ReleaseNote {
  version: string;
  date: string;
  title?: string;
  imageUrl?: string;
  imageMaxHeight?: number;
  items?: string[];
  news?: ReleaseNews[];
}

@Component({
  selector: 'app-release-notes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './release-notes.component.html',
  styleUrl: './release-notes.component.css'
})
export class ReleaseNotesComponent implements OnInit, OnDestroy {
  notes: ReleaseNote[] = [];
  private _show = false;
  
  get show() { return this._show; }
  set show(value: boolean) {
    this._show = value;
    if (value) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      this.activeImageUrl = null;
    }
  }
  
  showHistory = false;
  activeImageUrl: string | null = null;
  private readonly STORAGE_KEY = 'last_seen_release_version';
  private subscription: Subscription | null = null;
  private hasBeenClosedInSession = false;

  private readonly http = inject(HttpClient);
  private readonly releaseNotesService = inject(ReleaseNotesService);
  private readonly supabaseService = inject(SupabaseService);

  async ngOnInit() {
    this.http.get<ReleaseNote[]>('assets/release-notes.json').subscribe({
      next: async (data) => {
        if (data && data.length > 0) {
          this.notes = data;
          if (await this.isAuthenticated()) {
            this.checkVisibility();
          }
        }
      },
      error: (err) => console.error('Error loading release notes:', err)
    });

    // Listen to authentication changes
    const authSub = this.supabaseService.authState$.subscribe(async (state) => {
      if (this.notes.length > 0) {
        if (await this.isAuthenticated()) {
          this.checkVisibility();
        } else {
          this.show = false;
        }
      }
    });

    this.subscription = this.releaseNotesService.showNotes$.subscribe(async (show) => {
      if (show && this.notes.length > 0) {
        if (await this.isAuthenticated()) {
          this.showHistory = true;
          this.show = true;
        }
      }
    });

    if (this.subscription) {
      this.subscription.add(authSub);
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKeydown() {
    if (this.activeImageUrl) {
      this.closeImage();
    } else if (this.show) {
      this.close();
    }
  }

  private async isAuthenticated(): Promise<boolean> {
    if (!environment.enableAuth) {
      return true;
    }
    const { data } = await this.supabaseService.getUser();
    return !!data.user;
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    document.body.style.overflow = '';
  }

  private checkVisibility() {
    if (this.notes.length === 0 || this.hasBeenClosedInSession) return;
    const latestVersion = this.notes[0].version;
    const lastSeenVersion = localStorage.getItem(this.STORAGE_KEY);

    if (lastSeenVersion !== latestVersion) {
      this.showHistory = false;
      this.show = true;
    }
  }

  toggleHistory() {
    this.showHistory = !this.showHistory;
  }

  openImage(url: string | undefined) {
    if (url) {
      this.activeImageUrl = url;
    }
  }

  closeImage() {
    this.activeImageUrl = null;
  }

  close() {
    this.show = false;
    this.hasBeenClosedInSession = true;
    setTimeout(() => this.showHistory = false, 300);
  }

  dontShowAgain() {
    if (this.notes.length > 0) {
      localStorage.setItem(this.STORAGE_KEY, this.notes[0].version);
    }
    this.close();
  }
}
