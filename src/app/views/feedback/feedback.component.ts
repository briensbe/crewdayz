import { Component, AfterViewInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { SupabaseService } from '../../services/supabase.service';

declare var Canny: any;

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './feedback.component.html',
  styleUrl: './feedback.component.css',
})
export class FeedbackComponent implements AfterViewInit {
  private readonly supabaseService = inject(SupabaseService);
  protected readonly sdkFailed = signal(false);

  ngAfterViewInit() {
    // 1. Monitor the globally injected Canny script for loading errors
    const script = document.getElementById('canny-jssdk') as HTMLScriptElement;
    if (script) {
      script.onerror = () => {
        this.sdkFailed.set(true);
      };
    }

    // 2. If Canny global stub is missing, mark as failed
    if (typeof Canny !== 'function') {
      this.sdkFailed.set(true);
      return;
    }

    // 3. Render Canny Widget
    try {
      const currentUser = this.supabaseService.user();

      Canny('render', {
        boardToken: environment.cannyBoardToken,
        basePath: null,
        theme: 'auto',
      });
    } catch (err) {
      console.error('Failed to initialize Canny widget render:', err);
      this.sdkFailed.set(true);
    }
  }
}
