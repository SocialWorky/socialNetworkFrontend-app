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
    
    this.logService.log(LevelLogEnum.INFO, 'IOSViewportService', 'iOS viewport fixes initialized');
  }

  private setupViewportHeightFix(): void {
    // Fix for iOS Safari 100vh issue
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVH();
    
    // Listen for resize events
    fromEvent(window, 'resize')
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(100)
      )
      .subscribe(() => {
        setVH();
        this.logService.log(LevelLogEnum.DEBUG, 'IOSViewportService', 'Viewport height updated', { vh: window.innerHeight });
      });
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
          
          this.logService.log(LevelLogEnum.INFO, 'IOSViewportService', 'Orientation changed, viewport updated', { 
            orientation: window.orientation,
            vh: window.innerHeight 
          });
        }, 100);
      });
  }

  private updateModalHeights(): void {
    // Update notification panel height
    const notificationPanel = document.querySelector('.notifications-panel') as HTMLElement;
    if (notificationPanel) {
      const height = window.innerHeight;
      
      notificationPanel.style.height = `${height}px`;
      notificationPanel.style.height = '-webkit-fill-available';
      
      // Update content body height
      const contentBody = notificationPanel.querySelector('.content-body') as HTMLElement;
      if (contentBody) {
        const headerHeight = 80;
        const safeAreaTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top')) || 0;
        const bodyHeight = height - headerHeight - safeAreaTop;
        
        contentBody.style.height = `${bodyHeight}px`;
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
    
    this.logService.log(LevelLogEnum.INFO, 'IOSViewportService', 'Forced viewport update', { vh: window.innerHeight });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
} 