import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NotificationPanelService {
  private isActive = new BehaviorSubject<boolean>(false);

  getIsActive() {
    return this.isActive.asObservable();
  }

  togglePanel() {
    this.isActive.next(!this.isActive.value);
  }

  setPanelState(state: boolean) {
    this.isActive.next(state);
  }
}
