import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ScrollService {
  private scrollEndSource = new Subject<string>();
  private lastScrollTop = 0;
  private scrollDirection = 'up';
  private scrollThreshold = 5;

  scrollEnd$ = this.scrollEndSource.asObservable();

  notifyScrollEnd() {
    this.scrollEndSource.next('scrollEnd');
  }

  onScroll(event: any) {
    const threshold = 100; 
    const scrollTop = event.target.scrollTop;
    const scrollHeight = event.target.scrollHeight;
    const offsetHeight = event.target.offsetHeight;

    // Determine scroll direction
    if (Math.abs(scrollTop - this.lastScrollTop) > this.scrollThreshold) {
      this.scrollDirection = scrollTop > this.lastScrollTop ? 'down' : 'up';
      this.lastScrollTop = scrollTop;
    }

    // Show/hide scroll to top button
    if (scrollTop >= 200) {
      this.scrollEndSource.next('showScrollToTopButton');
    } else {
      this.scrollEndSource.next('hideScrollToTopButton');
    }

    // Smart navbar behavior (Facebook style)
    if (scrollTop < 50) {
      // At the top - always show navbar
      this.scrollEndSource.next('showNavbar');
    } else if (this.scrollDirection === 'up') {
      // Scrolling up - show navbar
      this.scrollEndSource.next('showNavbar');
    } else if (this.scrollDirection === 'down' && scrollTop > 100) {
      // Scrolling down and past threshold - hide navbar
      this.scrollEndSource.next('hideNavbar');
    }

    // Detect end of scroll for loading more content
    if (scrollTop + offsetHeight >= scrollHeight - threshold) {
      this.scrollEndSource.next('scrollEnd');
    }
  }

  scrollToTop() {
    const element = document.getElementById('first-publication');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'end' });
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
    const threshold = 100;
    const position = event.target.scrollTop + event.target.clientHeight;
    const height = event.target.scrollHeight;

    if (position >= height - threshold) {
      this.scrollEndSource.next('scrollEnd');
    }

    // Mostrar/ocultar botón de scroll to top (umbral más sensible)
    if (event.target.scrollTop > 200) {
      this.scrollEndSource.next('showScrollToTopButton');
    } else {
      this.scrollEndSource.next('hideScrollToTopButton');
    }
  }
}
