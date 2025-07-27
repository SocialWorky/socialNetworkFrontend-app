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



    // Device-specific navbar behavior
    this.handleNavbarBehavior(scrollTop, navbarShowThreshold, navbarHideThreshold);

    // Detect end of scroll for loading more content
    if (scrollTop + offsetHeight >= scrollHeight - scrollThreshold) {
      this.scrollEndSource.next('scrollEnd');
    }
  }

  private handleNavbarBehavior(scrollTop: number, showThreshold: number, hideThreshold: number) {
    if (!this.isMobile) {
      return; // Only apply navbar behavior on mobile
    }

    if (scrollTop < showThreshold) {
      // At the top - always show navbar
      this.scrollEndSource.next('showNavbar');
    } else if (this.scrollDirection === 'up') {
      // Scrolling up - show navbar
      this.scrollEndSource.next('showNavbar');
    } else if (this.scrollDirection === 'down' && scrollTop > hideThreshold) {
      // Scrolling down and past threshold - hide navbar
      this.scrollEndSource.next('hideNavbar');
    }
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
