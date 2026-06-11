import { Injectable, OnDestroy } from '@angular/core';
import { NotificationNewPublication } from '@shared/interfaces/notificationPublication.interface';
import { PublicationView } from '@shared/interfaces/publicationView.interface';
import { Socket } from 'ngx-socket-io';
import { BehaviorSubject, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { WebSocketOptimizationService } from '@shared/services/websocket-optimization.service';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';


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
      private webSocketOptimizationService: WebSocketOptimizationService,
      private logService: LogService
    ) {
      this.subscribeToNotificationNewPublication();
      this.subscribeToNotificationDeletePublication();
      this.subscribeToNotificationUpdatePublication();
    }

    private subscribeToNotificationNewPublication() {
      this.webSocketOptimizationService.fromEvent<NotificationNewPublication>('newPublication')
        .pipe(
          takeUntil(this._unsubscribeAll),
          catchError(error => {
            this.logService.log(LevelLogEnum.ERROR, 'NotificationPublicationService', 'Error in newPublication event', { error });
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
      this.webSocketOptimizationService.fromEvent<{_id: string}>('deletePublication')
        .pipe(
          takeUntil(this._unsubscribeAll),
          catchError(error => {
            this.logService.log(LevelLogEnum.ERROR, 'NotificationPublicationService', 'Error in deletePublication event', { error });
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
      this.webSocketOptimizationService.fromEvent<PublicationView[]>('updatePublication')
        .pipe(
          takeUntil(this._unsubscribeAll),
          catchError(error => {
            this.logService.log(LevelLogEnum.ERROR, 'NotificationPublicationService', 'Error in updatePublication event', { error });
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
      // Update the local stream immediately so the author's own feed shows the new
      // publication right away, without depending on the WebSocket round-trip (which can be
      // missed during socket reconnects or a token refresh, forcing a manual reload).
      // The home/profile feed dedupes by _id, so the echoed socket event is a no-op.
      if (payload?.publications?._id) {
        this._notificationNewPublication.next([payload]);
      }
      // Also broadcast to other clients via socket.
      this.webSocketOptimizationService.emit('newPublication', payload);
    }

    sendNotificationDeletePublication(payload: any) {
      this.webSocketOptimizationService.emit('deletePublication', payload);
    }

    sendNotificationUpdatePublication(payload: PublicationView[]) {
      // Update local BehaviorSubject immediately for instant UI update
      this._notificationUpdatePublication.next(payload);
      // Also emit to socket for other clients
      this.webSocketOptimizationService.emit('updatePublication', payload);
    }

    ngOnDestroy() {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }
}
