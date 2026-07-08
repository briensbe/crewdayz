import { Directive, ElementRef, inject, input, model, OnInit, OnDestroy, Renderer2, NgZone } from '@angular/core';

@Directive({
  selector: '[appResizable]',
  standalone: true,
})
export class ResizableDirective implements OnInit, OnDestroy {
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private zone = inject(NgZone);

  // Model signal input to bind and update the width
  width = model.required<number>({ alias: 'appResizable' });
  minWidth = input<number>(100);
  maxWidth = input<number>(600);
  storageKey = input<string>();

  private resizer!: HTMLDivElement;
  private destroyListeners?: () => void;
  private animationFrameId: number | null = null;
  private localWidth: number = 0;

  ngOnInit() {
    // 1. Create the resizer handle
    this.resizer = this.renderer.createElement('div');
    this.renderer.addClass(this.resizer, 'resizer');
    this.renderer.appendChild(this.el.nativeElement, this.resizer);

    // 2. Set positioning context on parent th (relative, for resizer absolute alignment)
    if (!this.el.nativeElement.classList.contains('sticky-col')) {
      this.renderer.setStyle(this.el.nativeElement, 'position', 'relative');
    }

    // 3. Bind mousedown & touchstart
    const mdListener = this.renderer.listen(this.resizer, 'mousedown', (e: MouseEvent) => this.onStart(e));
    const tsListener = (e: TouchEvent) => this.onStart(e);
    this.resizer.addEventListener('touchstart', tsListener, { passive: true });

    // Catch click events on the resizer handle to prevent bubble-up to TH sorting headers
    const clickListener = this.renderer.listen(this.resizer, 'click', (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    });

    this.destroyListeners = () => {
      mdListener();
      this.resizer.removeEventListener('touchstart', tsListener);
      clickListener();
    };
  }

  ngOnDestroy() {
    if (this.destroyListeners) {
      this.destroyListeners();
    }
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private onStart(event: MouseEvent | TouchEvent) {
    // Check if touch or left-click
    if ('button' in event && event.button !== 0) return;

    if (event.type === 'mousedown') {
      event.preventDefault();
    }
    event.stopPropagation();

    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const startX = clientX;
    const startWidth = this.width();
    this.localWidth = startWidth;
    let wasDragged = false;

    this.renderer.addClass(document.body, 'resizing');

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const deltaX = currentX - startX;
      if (Math.abs(deltaX) > 2) {
        wasDragged = true;
      }
      const targetWidth = startWidth + deltaX;

      if (this.animationFrameId !== null) {
        cancelAnimationFrame(this.animationFrameId);
      }

      this.animationFrameId = requestAnimationFrame(() => {
        const clampedWidth = Math.max(this.minWidth(), Math.min(this.maxWidth(), targetWidth));
        this.localWidth = clampedWidth;

        // Directly update CSS custom property on closest table for GPU-accelerated 60fps layout shifting
        const table = this.el.nativeElement.closest('table');
        if (table) {
          table.style.setProperty('--name-col-width', clampedWidth + 'px');
        } else {
          // Fallback for non-table layouts
          this.renderer.setStyle(this.el.nativeElement, 'width', clampedWidth + 'px');
          this.renderer.setStyle(this.el.nativeElement, 'min-width', clampedWidth + 'px');
          this.renderer.setStyle(this.el.nativeElement, 'max-width', clampedWidth + 'px');
        }
      });
    };

    const onEnd = () => {
      this.renderer.removeClass(document.body, 'resizing');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchend', onEnd);

      // Trigger Angular change detection only once at the end of the drag
      this.zone.run(() => {
        this.width.set(this.localWidth);
      });

      // If a drag operation actually happened, intercept and discard the subsequent click event on the host TH
      if (wasDragged) {
        const preventClick = (clickEvent: MouseEvent) => {
          clickEvent.preventDefault();
          clickEvent.stopPropagation();
        };
        this.el.nativeElement.addEventListener('click', preventClick, { capture: true, once: true });
        
        // Safety timeout to remove the capturing listener in case no click event fires
        setTimeout(() => {
          this.el.nativeElement.removeEventListener('click', preventClick, { capture: true });
        }, 50);
      }

      // Persist to localStorage only when resizing is completed
      const key = this.storageKey();
      if (key) {
        try {
          localStorage.setItem(key, JSON.stringify(this.localWidth));
        } catch (e) {
          console.error(`Error saving to localStorage key "${key}":`, e);
        }
      }
    };

    // Add event listeners outside Angular zone to prevent triggering change detection on every move
    this.zone.runOutsideAngular(() => {
      document.addEventListener('mousemove', onMove);
      document.addEventListener('touchmove', onMove, { passive: true });
      document.addEventListener('mouseup', onEnd);
      document.addEventListener('touchend', onEnd);
    });
  }
}
