import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MediaEventsService {
  private mediaProcessedSubject = new Subject<any>();
  public mediaProcessed$ = this.mediaProcessedSubject.asObservable();

  notifyMediaProcessed(message: any): void {
    this.mediaProcessedSubject.next(message);
  }

  hasSubscribers(): boolean {
    return this.mediaProcessedSubject.observers.length > 0;
  }

  getSubscriberCount(): number {
    return this.mediaProcessedSubject.observers.length;
  }
} 