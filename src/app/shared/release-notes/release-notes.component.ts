import { Component, OnInit, OnDestroy, HostListener, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ReleaseNotesService } from '../../services/release-notes.service';
import { SupabaseService } from '../../services/supabase.service';
import { PreferencesService } from '../../services/preferences.service';
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
  styleUrl: './release-notes.component.css',
})
export class ReleaseNotesComponent implements OnInit, OnDestroy {
  readonly notes = signal<ReleaseNote[]>([]);
  readonly show = signal<boolean>(false);
  readonly showHistory = signal<boolean>(false);
  readonly activeImageUrl = signal<string | null>(null);

  readonly latestNote = computed<ReleaseNote | null>(() => this.notes()[0] ?? null);

  private readonly STORAGE_KEY = 'crewdayz_last_seen_release_version';
  private subscription: Subscription | null = null;
  private hasBeenClosedInSession = false;

  private readonly http = inject(HttpClient);
  private readonly releaseNotesService = inject(ReleaseNotesService);
  private readonly supabaseService = inject(SupabaseService);
  private readonly preferencesService = inject(PreferencesService, { optional: true });

  constructor() {
    effect(() => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = this.show() ? 'hidden' : '';
      }
    });
  }

  async ngOnInit() {
    this.http.get<ReleaseNote[]>('assets/release-notes.json').subscribe({
      next: async (data) => {
        if (data && data.length > 0) {
          this.notes.set(data);
          if (await this.isAuthenticated()) {
            this.checkVisibility();
          }
        }
      },
      error: (err) => console.error('Error loading release notes:', err),
    });

    // Listen to authentication changes
    const authSub = this.supabaseService.authState$.subscribe(async () => {
      if (this.notes().length > 0) {
        if (await this.isAuthenticated()) {
          this.checkVisibility();
        } else {
          this.show.set(false);
          this.activeImageUrl.set(null);
        }
      }
    });

    this.subscription = this.releaseNotesService.showNotes$.subscribe(async (show) => {
      if (show && this.notes().length > 0) {
        if (await this.isAuthenticated()) {
          this.showHistory.set(true);
          this.show.set(true);
        }
      }
    });

    if (this.subscription) {
      this.subscription.add(authSub);
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKeydown() {
    if (this.activeImageUrl()) {
      this.closeImage();
    } else if (this.show()) {
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
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }

  private checkVisibility() {
    const notes = this.notes();
    if (notes.length === 0 || this.hasBeenClosedInSession) return;
    const latestVersion = notes[0].version;
    const remoteVersion = this.preferencesService?.preferences().releaseNotes?.lastSeenVersion;
    const lastSeenVersion = remoteVersion || (typeof localStorage !== 'undefined' ? localStorage.getItem(this.STORAGE_KEY) : null);

    if (lastSeenVersion !== latestVersion) {
      this.showHistory.set(false);
      this.show.set(true);
    }
  }

  toggleHistory() {
    this.showHistory.update((show) => !show);
  }

  openImage(url: string | undefined) {
    if (url) {
      this.activeImageUrl.set(url);
    }
  }

  closeImage() {
    this.activeImageUrl.set(null);
  }

  close() {
    this.show.set(false);
    this.activeImageUrl.set(null);
    this.hasBeenClosedInSession = true;
    setTimeout(() => this.showHistory.set(false), 300);
  }

  dontShowAgain() {
    const notes = this.notes();
    if (notes.length > 0) {
      const version = notes[0].version;
      this.preferencesService?.setLastSeenReleaseNotesVersion(version);
      try {
        localStorage.setItem(this.STORAGE_KEY, version);
      } catch (e) {
        console.warn('Could not save release version to localStorage', e);
      }
    }
    this.close();
  }
}
