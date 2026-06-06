import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { DeviceDetectionService } from './device-detection.service';

interface ScrollConfig {
  scrollThreshold: number;
  navbarShowThreshold: number;
  navbarHideThreshold: number;
  scrollDirectionThreshold: number;
}

@Injectable({
  providedIn: 'root',
})
export class ScrollService {
  private scrollEndSource = new Subject<string>();
  private lastScrollTop = 0;
  private scrollDirection = 'up';
  private isMobile = false;

  // Near the bottom, hiding the navbar resizes the scroll area (top 50px -> 0), which
  // re-fires scroll and makes the top/bottom navbar flicker. Latch it visible there with
  // hysteresis: lock within bottomLockZone of the end, release only past bottomReleaseZone.
  private navbarLockedAtBottom = false;
  private lastNavbarEvent: string | null = null;
  private readonly bottomLockZone = 120;
  private readonly bottomReleaseZone = 240;
  
  // Device-specific configurations
  private mobileConfig: ScrollConfig = {
    scrollThreshold: 100,
    navbarShowThreshold: 50,
    navbarHideThreshold: 100,
    scrollDirectionThreshold: 5
  };
  
  private desktopConfig: ScrollConfig = {
    scrollThreshold: 100,
    navbarShowThreshold: 0,
    navbarHideThreshold: 0,
    scrollDirectionThreshold: 5
  };

  scrollEnd$ = this.scrollEndSource.asObservable();

  constructor(private deviceDetectionService: DeviceDetectionService) {
    this.isMobile = this.deviceDetectionService.isMobile();
    
    // Subscribe to device changes to keep isMobile updated
    this.deviceDetectionService.getResizeEvent().subscribe(() => {
      this.isMobile = this.deviceDetectionService.isMobile();
    });
  }

  private get config(): ScrollConfig {
    return this.isMobile ? this.mobileConfig : this.desktopConfig;
  }

  notifyScrollEnd() {
    this.scrollEndSource.next('scrollEnd');
  }

  onScroll(event: any) {
    const { scrollThreshold, navbarShowThreshold, navbarHideThreshold, scrollDirectionThreshold } = this.config;
    const scrollTop = event.target.scrollTop;
    const scrollHeight = event.target.scrollHeight;
    const offsetHeight = event.target.offsetHeight;

    // Determine scroll direction
    if (Math.abs(scrollTop - this.lastScrollTop) > scrollDirectionThreshold) {
      this.scrollDirection = scrollTop > this.lastScrollTop ? 'down' : 'up';
      this.lastScrollTop = scrollTop;
    }

    const distanceFromBottom = scrollHeight - (scrollTop + offsetHeight);

    // Device-specific navbar behavior
    this.handleNavbarBehavior(scrollTop, navbarShowThreshold, navbarHideThreshold, distanceFromBottom);

    // Detect end of scroll for loading more content
    if (distanceFromBottom <= scrollThreshold) {
      this.scrollEndSource.next('scrollEnd');
    }
  }

  private handleNavbarBehavior(scrollTop: number, showThreshold: number, hideThreshold: number, distanceFromBottom: number) {
    if (!this.isMobile) {
      return; // Only apply navbar behavior on mobile
    }

    // Hysteresis latch: keep the navbar shown near the bottom so toggling it (which resizes
    // the scroll area and re-fires scroll) cannot oscillate the top/bottom navbar.
    if (distanceFromBottom <= this.bottomLockZone) {
      this.navbarLockedAtBottom = true;
    } else if (distanceFromBottom > this.bottomReleaseZone) {
      this.navbarLockedAtBottom = false;
    }

    if (this.navbarLockedAtBottom) {
      this.emitNavbar('showNavbar');
      return;
    }

    if (scrollTop < showThreshold) {
      // At the top - always show navbar
      this.emitNavbar('showNavbar');
    } else if (this.scrollDirection === 'up') {
      // Scrolling up - show navbar
      this.emitNavbar('showNavbar');
    } else if (this.scrollDirection === 'down' && scrollTop > hideThreshold) {
      // Scrolling down and past threshold - hide navbar
      this.emitNavbar('hideNavbar');
    }
  }

  // Emit a navbar event only when it changes, so a steady scroll does not spam identical
  // show/hide events (which add change-detection churn and can amplify flicker).
  private emitNavbar(event: 'showNavbar' | 'hideNavbar') {
    if (this.lastNavbarEvent === event) {
      return;
    }
    this.lastNavbarEvent = event;
    this.scrollEndSource.next(event);
  }



  setScrollContainer(selector: string) {
    const container = document.querySelector(selector);
    if (container) {
      container.addEventListener('scroll', (event) => {
        this.handleScroll(event);
      });
    }
  }

  private handleScroll(event: any) {
    const { scrollThreshold } = this.config;
    const position = event.target.scrollTop + event.target.clientHeight;
    const height = event.target.scrollHeight;

    if (position >= height - scrollThreshold) {
      this.scrollEndSource.next('scrollEnd');
    }


  }
}
