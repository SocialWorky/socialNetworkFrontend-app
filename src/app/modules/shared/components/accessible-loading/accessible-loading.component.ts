import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'worky-accessible-loading',
  template: `
    <div 
      *ngIf="show" 
      class="accessible-loading-overlay"
      [class.fullscreen]="fullscreen"
      [attr.aria-label]="ariaLabel"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      (keydown.escape)="onEscapeKey()">
      
      <div class="accessible-loading-content">
        <div class="loading-spinner">
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
        </div>
        
        <div *ngIf="message" class="loading-message" role="status" aria-live="polite">
          {{ message }}
        </div>
        
        <div *ngIf="subMessage" class="loading-sub-message">
          {{ subMessage }}
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./accessible-loading.component.scss'],
  standalone: false
})
export class AccessibleLoadingComponent implements OnInit, OnDestroy {
  @Input() show: boolean = false;
  @Input() message: string = 'Cargando...';
  @Input() subMessage: string = '';
  @Input() fullscreen: boolean = false;
  @Input() ariaLabel: string = 'Cargando contenido';

  private destroy$ = new Subject<void>();

  constructor(private _cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Ensure proper focus management
    if (this.show) {
      this.setupFocusManagement();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFocusManagement(): void {
    // Focus the loading overlay when it appears
    setTimeout(() => {
      const overlay = document.querySelector('.accessible-loading-overlay') as HTMLElement;
      if (overlay) {
        overlay.focus();
      }
    }, 100);
  }

  onEscapeKey(): void {
    // Allow users to dismiss loading with Escape key
    // This provides better accessibility and user control
    if (this.show) {
      this.show = false;
      this._cdr.markForCheck();
    }
  }
}
