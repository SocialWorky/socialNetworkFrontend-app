import { Injectable, OnDestroy } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { BehaviorSubject, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

import { Message } from '../../../pages/messages/interfaces/message.interface';

@Injectable({
  providedIn: 'root'
})
export class NotificationMessageChatService implements OnDestroy {
    private _notificationMessageChat = new BehaviorSubject<any[]>([]);

    public notificationMessageChat$ = this._notificationMessageChat.asObservable();

    private _unsubscribeAll = new Subject<void>();

    constructor(
      private socket: Socket,
    ) { 
      this.subscribeToNotificationMessageChat();
    }

    private subscribeToNotificationMessageChat() {
      this.socket.fromEvent('newMessageChat')
      .pipe(
        takeUntil(this._unsubscribeAll),
        catchError(error => {
            throw error;
        })
      )
      .subscribe((data: any) => {
        this._notificationMessageChat.next(data);
      });
    }

    sendNotificationMessageChat(payload: Message) {
      this.socket.emit('generalNotification');
      this.socket.emit('newMessageChat', payload);
    }

    ngOnDestroy() {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }
}