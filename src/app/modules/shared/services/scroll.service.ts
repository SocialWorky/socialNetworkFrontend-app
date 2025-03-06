import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ScrollService {
  private scrollEndSource = new Subject<string>();

  scrollEnd$ = this.scrollEndSource.asObservable();

  notifyScrollEnd() {
    this.scrollEndSource.next('scrollEnd');
  }

  onScroll(event: any) {
    const threshold = 100; 
    const scrollTop = event.target.scrollTop;
    const scrollHeight = event.target.scrollHeight;
    const offsetHeight = event.target.offsetHeight;

    if (scrollTop >= 1500) {
      this.scrollEndSource.next('showScrollToTopButton');
    } else {
      this.scrollEndSource.next('hideScrollToTopButton');
    }

    if (scrollTop < 50) {
      this.scrollEndSource.next('hideNavbar');
    }

    if (scrollTop >= 50) {
      this.scrollEndSource.next('showNavbar');
    }

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

}
