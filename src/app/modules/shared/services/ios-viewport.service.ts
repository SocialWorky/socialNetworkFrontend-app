import { Injectable, OnDestroy } from '@angular/core';
import { LogService, LevelLogEnum } from './core-apis/log.service';
import { Subject, fromEvent } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class IOSViewportService implements OnDestroy {
  private destroy$ = new Subject<void>();
  private isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  constructor(private logService: LogService) {
    if (this.isIOS) {
      this.initializeIOSViewportFixes();
    }
  }

  private initializeIOSViewportFixes(): void {
    this.setupViewportHeightFix();
    this.setupOrientationChangeHandler();
    this.setupNotificationPanelFix();
    
    // iOS viewport fixes initialized - no need to log every initialization
  }

  private setupViewportHeightFix(): void {
    // visualViewport.height is the most reliable source on iOS standalone PWA —
    // it reflects the actual rendered viewport height after safe-area layout,
    // whereas window.innerHeight and dvh can be stale on first paint.
    const getHeight = (): number =>
      window.visualViewport ? window.visualViewport.height : window.innerHeight;

    const setVH = () => {
      const vh = getHeight() * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVH();

    // Re-run after two paint cycles — iOS standalone sometimes under-reports
    // visualViewport.height on the very first render before layout stabilises.
    setTimeout(() => setVH(), 50);
    setTimeout(() => setVH(), 300);

    fromEvent(window, 'resize')
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(100)
      )
      .subscribe(() => setVH());

    // visualViewport fires its own resize event (e.g. on keyboard open/close
    // and after iOS finishes safe-area layout) — subscribe for faster response.
    if (window.visualViewport) {
      fromEvent(window.visualViewport, 'resize')
        .pipe(
          takeUntil(this.destroy$),
          debounceTime(50)
        )
        .subscribe(() => setVH());
    }
  }

  private setupOrientationChangeHandler(): void {
    // Handle orientation changes
    fromEvent(window, 'orientationchange')
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300)
      )
      .subscribe(() => {
        setTimeout(() => {
          const vh = window.innerHeight * 0.01;
          document.documentElement.style.setProperty('--vh', `${vh}px`);
          
          // Force recalculation of modal heights
          this.updateModalHeights();
          
          // Orientation changed, viewport updated - no need to log every orientation change
        }, 100);
      });
  }

  private setupNotificationPanelFix(): void {
    // Specific fix for notification panel on iOS
    const fixNotificationPanel = () => {
      const notificationPanel = document.querySelector('.notifications-panel') as HTMLElement;
      if (notificationPanel) {
        // Ensure panel starts from the very top
        notificationPanel.style.top = '0';
        notificationPanel.style.marginTop = '0';
        
        // Set proper height
        const height = window.innerHeight;
        notificationPanel.style.height = `${height}px`;
        notificationPanel.style.height = '-webkit-fill-available';
        notificationPanel.style.height = `calc(var(--vh, 1vh) * 100)`;
        
        // Update content body height
        const contentBody = notificationPanel.querySelector('.content-body') as HTMLElement;
        if (contentBody) {
          const headerHeight = 80;
          const bodyHeight = height - headerHeight;
          
          contentBody.style.height = `${bodyHeight}px`;
          contentBody.style.height = `calc(-webkit-fill-available - ${headerHeight}px)`;
          contentBody.style.height = `calc((var(--vh, 1vh) * 100) - ${headerHeight}px)`;
        }
        
        // Ensure header is properly positioned
        const contentHeader = notificationPanel.querySelector('.content-header') as HTMLElement;
        if (contentHeader) {
          contentHeader.style.marginTop = '0';
          contentHeader.style.top = '0';
        }
      }
    };

    // Apply fix immediately and on resize
    fixNotificationPanel();
    
    fromEvent(window, 'resize')
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(100)
      )
      .subscribe(() => {
        fixNotificationPanel();
      });
  }

  private updateModalHeights(): void {
    // Update notification panel height
    const notificationPanel = document.querySelector('.notifications-panel') as HTMLElement;
    if (notificationPanel) {
      const height = window.innerHeight;
      
      notificationPanel.style.height = `${height}px`;
      notificationPanel.style.height = '-webkit-fill-available';
      notificationPanel.style.height = `calc(var(--vh, 1vh) * 100)`;
      
      // Ensure panel starts from the very top
      notificationPanel.style.top = '0';
      notificationPanel.style.marginTop = '0';
      
      // Update content body height
      const contentBody = notificationPanel.querySelector('.content-body') as HTMLElement;
      if (contentBody) {
        const headerHeight = 80;
        const bodyHeight = height - headerHeight;
        
        contentBody.style.height = `${bodyHeight}px`;
        contentBody.style.height = `calc(-webkit-fill-available - ${headerHeight}px)`;
        contentBody.style.height = `calc((var(--vh, 1vh) * 100) - ${headerHeight}px)`;
      }
      
      // Ensure header is properly positioned
      const contentHeader = notificationPanel.querySelector('.content-header') as HTMLElement;
      if (contentHeader) {
        contentHeader.style.marginTop = '0';
        contentHeader.style.top = '0';
      }
    }
  }

  public getViewportHeight(): number {
    return window.innerHeight;
  }

  public isIOSDevice(): boolean {
    return this.isIOS;
  }

  public forceViewportUpdate(): void {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    this.updateModalHeights();
    
    // Forced viewport update - no need to log every forced update
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
} 