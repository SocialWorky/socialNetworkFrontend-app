import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProfileNotificationService {
  private profileUpdatedSubject = new Subject<void>();

  profileUpdated$ = this.profileUpdatedSubject.asObservable();

  notifyProfileUpdated() {
    this.profileUpdatedSubject.next();
  }
}
