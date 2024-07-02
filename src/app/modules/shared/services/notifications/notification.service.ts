import { Injectable, OnDestroy } from '@angular/core';
import { PublicationView } from '@shared/interfaces/publicationView.interface';
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

  sendNotification(publication?: PublicationView) {
    this.socket.emit('generalNotification', publication);
  }


  ngOnDestroy() {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }
}
