import { Injectable, OnDestroy } from '@angular/core';
import { NotificationNewPublication } from '@shared/interfaces/notificationPublication.interface';
import { PublicationView } from '@shared/interfaces/publicationView.interface';
import { Socket } from 'ngx-socket-io';
import { BehaviorSubject, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { NotificationService } from './notification.service';


@Injectable({
  providedIn: 'root'
})
export class NotificationPublicationService implements OnDestroy {
    private _notificationNewPublication = new BehaviorSubject<NotificationNewPublication[]>([]);
    private _notificationDeletePublication = new BehaviorSubject<{_id: string}[]>([]);
    private _notificationUpdatePublication = new BehaviorSubject<PublicationView[]>([]);

    public notificationNewPublication$ = this._notificationNewPublication.asObservable();
    public notificationDeletePublication$ = this._notificationDeletePublication.asObservable();
    public notificationUpdatePublication$ = this._notificationUpdatePublication.asObservable();

    private _unsubscribeAll = new Subject<void>();

    constructor(
      private socket: Socket,
    ) { 
      this.subscribeToNotificationNewPublication();
      this.subscribeToNotificationDeletePublication();
      this.subscribeToNotificationUpdatePublication();
    }

    private subscribeToNotificationNewPublication() {
      this.socket.fromEvent<NotificationNewPublication>('newPublication')
        .pipe(
          takeUntil(this._unsubscribeAll),
          catchError(error => {
            throw error;
          })
        )
        .subscribe({
          next: (data: NotificationNewPublication) => {
            this._notificationNewPublication.next([data]);
          }
        });
    }

    private subscribeToNotificationDeletePublication() {
      this.socket.fromEvent<{_id: string}>('deletePublication')
        .pipe(
          takeUntil(this._unsubscribeAll),
          catchError(error => {
            throw error;
          })
        )
        .subscribe({
          next: (data) => {
            this._notificationDeletePublication.next([data]);
          }
        });
    }

    private subscribeToNotificationUpdatePublication() {
      this.socket.fromEvent<PublicationView[]>('updatePublication')
        .pipe(
          takeUntil(this._unsubscribeAll),
          catchError(error => {
            throw error;
          })
        )
        .subscribe({
          next: (data: PublicationView[]) => {
            this._notificationUpdatePublication.next(data);
          }
        });
    }

    sendNotificationNewPublication(payload: any) {
      this.socket.emit('newPublication', payload);
    }

    sendNotificationDeletePublication(payload: any) {
      this.socket.emit('deletePublication', payload);
    }

    sendNotificationUpdatePublication(payload: any) {
      this.socket.emit('updatePublication', payload);
    }

    ngOnDestroy() {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }
}
