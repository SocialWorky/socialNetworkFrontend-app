import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EmojiEventsService {
  private emojiProcessedSubject = new Subject<any>();
  public emojiProcessed$ = this.emojiProcessedSubject.asObservable();

  notifyEmojiProcessed(message: any): void {
    this.emojiProcessedSubject.next(message);
  }

  hasSubscribers(): boolean {
    return this.emojiProcessedSubject.observers.length > 0;
  }

  getSubscriberCount(): number {
    return this.emojiProcessedSubject.observers.length;
  }
}
