import { Injectable, OnDestroy } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { BehaviorSubject, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  private _notification = new BehaviorSubject<void>(undefined);

  public notification$ = this._notification.asObservable();

  private _unsubscribeAll = new Subject<void>();

  constructor(private socket: Socket) {
    this.subscribeToNotification();
  }

  private subscribeToNotification() {
    this.socket.fromEvent('generalNotification')
      .pipe(
        takeUntil(this._unsubscribeAll),
        catchError(error => {
          throw error;
        })
      )
      .subscribe((data: any) => {
        this._notification.next(data);
      });
  }

  sendNotification(payload?: any) {
    this.socket.emit('generalNotification', payload);
  }

  // Updates the badge counter locally without a WebSocket roundtrip.
  // Use this from within the notifications panel (read/delete actions)
  // to avoid triggering a server broadcast that cascades into the panel.
  emitLocalUpdate(): void {
    this._notification.next(undefined);
  }


  ngOnDestroy() {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }
}
