import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { DeviceDetectionService } from './device-detection.service';

interface ScrollConfig {
  scrollThreshold: number;
  navbarShowThreshold: number;
  navbarHideThreshold: number;
  scrollToTopOffset: number;
  scrollToTopTimeout: number;
  scrollDirectionThreshold: number;
}

@Injectable({
  providedIn: 'root',
})
export class ScrollService {
  private scrollEndSource = new Subject<string>();
  private lastScrollTop = 0;
  private scrollDirection = 'up';
  private isScrollingToTop = false;
  private isMobile = false;
  
  // Device-specific configurations
  private mobileConfig: ScrollConfig = {
    scrollThreshold: 100,
    navbarShowThreshold: 50,
    navbarHideThreshold: 100,
    scrollToTopOffset: 20,
    scrollToTopTimeout: 1500,
    scrollDirectionThreshold: 5
  };
  
  private desktopConfig: ScrollConfig = {
    scrollThreshold: 100,
    navbarShowThreshold: 0,
    navbarHideThreshold: 0,
    scrollToTopOffset: 0,
    scrollToTopTimeout: 0,
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

    // Show/hide scroll to top button
    if (scrollTop >= 200) {
      this.scrollEndSource.next('showScrollToTopButton');
    } else {
      this.scrollEndSource.next('hideScrollToTopButton');
    }

    // Device-specific navbar behavior
    this.handleNavbarBehavior(scrollTop, navbarShowThreshold, navbarHideThreshold);

    // Detect end of scroll for loading more content
    if (scrollTop + offsetHeight >= scrollHeight - scrollThreshold) {
      this.scrollEndSource.next('scrollEnd');
    }
  }

  private handleNavbarBehavior(scrollTop: number, showThreshold: number, hideThreshold: number) {
    if (!this.isMobile || this.isScrollingToTop) {
      return; // Only apply navbar behavior on mobile and when not scrolling to top
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

  scrollToTop() {
    const element = document.getElementById('first-publication');
    
    if (!element) {
      this.fallbackScrollToTop();
      return;
    }

    if (this.isMobile) {
      this.scrollToTopMobile(element);
    } else {
      this.scrollToTopDesktop(element);
    }
  }

  private scrollToTopMobile(element: HTMLElement) {
    const { scrollToTopOffset, scrollToTopTimeout } = this.config;
    
    this.isScrollingToTop = true;
    this.scrollEndSource.next('showNavbar');
    
    // Find the content container and scroll to the element
    const contentContainer = document.querySelector('.content-publications');
    if (contentContainer) {
      const rect = element.getBoundingClientRect();
      const containerRect = contentContainer.getBoundingClientRect();
      const relativeTop = rect.top - containerRect.top;
      const targetPosition = contentContainer.scrollTop + relativeTop - scrollToTopOffset;
      
      contentContainer.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    } else {
      // Fallback to window scroll if container not found
      const rect = element.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const targetPosition = scrollTop + rect.top - scrollToTopOffset;
      
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    }
    
    setTimeout(() => {
      this.isScrollingToTop = false;
    }, scrollToTopTimeout);
  }

  private scrollToTopDesktop(element: HTMLElement) {
    // Desktop: Use scrollIntoView with 'nearest' to avoid navbar movement
    element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'nearest',
      inline: 'nearest'
    });
  }

  private fallbackScrollToTop() {
    // Fallback: scroll to top of page if element not found
    const contentContainer = document.querySelector('.content-publications');
    if (contentContainer) {
      contentContainer.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    } else {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
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

    // Show/hide scroll to top button
    if (event.target.scrollTop > 200) {
      this.scrollEndSource.next('showScrollToTopButton');
    } else {
      this.scrollEndSource.next('hideScrollToTopButton');
    }
  }
}
