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
    const threshold = 1500; 
    const scrollTop = event.target.scrollTop; 

    if (scrollTop >= threshold) {
      this.scrollEndSource.next('showScrollToTopButton');
    } else {
      this.scrollEndSource.next('hideScrollToTopButton');
    }
  }

  scrollToTop() {
    const element = document.getElementById('first-publication');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

}
