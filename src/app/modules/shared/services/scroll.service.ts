import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ScrollService {
  private scrollEndSource = new Subject<void>();

  scrollEnd$ = this.scrollEndSource.asObservable();

  notifyScrollEnd() {
    this.scrollEndSource.next();
  }
}
