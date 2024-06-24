import { Injectable, OnDestroy } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { BehaviorSubject, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class NotificationCommentService implements OnDestroy {
    private _notificationComment = new BehaviorSubject<any[]>([]);
    public notificationComment$ = this._notificationComment.asObservable();
    private _unsubscribeAll = new Subject<void>();

    constructor(private socket: Socket) { 
        this.subscribeToNotificationComment();
    }

    private subscribeToNotificationComment() {
        this.socket.fromEvent('newComment')
            .pipe(
                takeUntil(this._unsubscribeAll),
                catchError(error => {
                    throw error;
                })
            )
            .subscribe((data: any) => {
                this._notificationComment.next(data);
            });
    }

    sendNotificationComment(payload: { commentId: string, idPublication: string, userEmittedId: string, authorPublicationId: string }) {
        this.socket.emit('newComment', payload);
    }

    ngOnDestroy() {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }
}