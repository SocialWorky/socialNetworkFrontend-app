import { Injectable, OnDestroy } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { BehaviorSubject, Subject } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';

import { SocketService } from '../socket.service';
import { LogService, LevelLogEnum } from '../core-apis/log.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationMessageChatService implements OnDestroy {
    private _notificationMessageChat = new BehaviorSubject<any[]>([]);

    public notificationMessageChat$ = this._notificationMessageChat.asObservable();

    private _unsubscribeAll = new Subject<void>();

  private _listenersSetup = false;

    constructor(
      private socket: Socket,
    private _socketService: SocketService,
    private _logService: LogService
  ) { 
    this.setupSocketListeners();
    this.setupConnectionHandlers();
  }

  private setupConnectionHandlers() {
    this.socket.on('connect', () => {
      this._listenersSetup = false;
      this.setupSocketListeners();
    });

    this.socket.on('disconnect', () => {
      // Socket disconnected
    });

    this.socket.on('reconnect', () => {
      this._listenersSetup = false;
      this.setupSocketListeners();
    });
  }

  private setupSocketListeners() {
    if (this._listenersSetup) {
      return;
    }

      this.socket.fromEvent('newMessageChat')
      .pipe(
        takeUntil(this._unsubscribeAll),
        catchError(error => {
          return [];
        })
      )
      .subscribe((data: any) => {
        if (data) {
          this._notificationMessageChat.next(data);
        }
      });

      this.socket.fromEvent('messageDelivered')
      .pipe(
        takeUntil(this._unsubscribeAll),
        catchError(error => {
          return [];
        })
      )
      .subscribe((data: any) => {
        if (data) {
          this._notificationMessageChat.next(data);
        }
      });

    this.socket.fromEvent('userTyping')
      .pipe(
        takeUntil(this._unsubscribeAll),
        catchError(error => {
          return [];
        })
      )
      .subscribe((data: any) => {
        if (data) {
          this._notificationMessageChat.next({ ...data, isTypingEvent: true });
        }
      });

    this.socket.fromEvent('messageRead')
      .pipe(
        takeUntil(this._unsubscribeAll),
        catchError(error => {
          return [];
        })
      )
      .subscribe((data: any) => {
        if (data) {
          this._notificationMessageChat.next({ ...data, isReadEvent: true });
        }
      });

    this.socket.fromEvent('messageEdited')
      .pipe(
        takeUntil(this._unsubscribeAll),
        catchError(error => {
          return [];
        })
      )
      .subscribe((data: any) => {
        if (data) {
          this._notificationMessageChat.next({ ...data, isEditedEvent: true });
        }
      });

    this.socket.fromEvent('messageDeleted')
      .pipe(
        takeUntil(this._unsubscribeAll),
        catchError(error => {
          return [];
        })
      )
      .subscribe((data: any) => {
        if (data) {
          this._notificationMessageChat.next({ ...data, isDeletedEvent: true });
        }
      });

    this.socket.fromEvent('error')
      .pipe(
        takeUntil(this._unsubscribeAll),
        catchError(error => {
          return [];
        })
      )
      .subscribe((error: any) => {
        // Socket error event
      });

    this._listenersSetup = true;
  }

  sendNotificationMessageChat(message: any, userInfo?: { userId: string; userName: string; userAvatar?: string }) {
    if (!message || (!message.content && !message.urlFile)) {
      return;
    }

    if (!this._socketService.isConnected()) {
      return;
    }

    const chatMessagePayload: any = {
      content: message.content || '',
    };

    if (message._id) {
      chatMessagePayload.messageId = message._id;
    }

    if (message.chatId) {
      chatMessagePayload.chatId = message.chatId;
    }

    if (message.senderId || userInfo?.userId) {
      chatMessagePayload.userId = message.senderId || userInfo?.userId;
    }

    if (message.receiverId) {
      chatMessagePayload.receiverId = message.receiverId;
    }

    if (userInfo?.userName) {
      chatMessagePayload.userName = userInfo.userName;
    }

    if (userInfo?.userAvatar) {
      chatMessagePayload.userAvatar = userInfo.userAvatar;
    }

    if (message.timestamp) {
      chatMessagePayload.timestamp = message.timestamp;
    }

    if (message.type) {
      chatMessagePayload.type = this.mapMessageTypeToGateway(message.type);
    }

    if (message.urlFile) {
      chatMessagePayload.urlFile = message.urlFile;
      chatMessagePayload.metadata = { urlFile: message.urlFile };
    }

    if (message.replyTo) {
      chatMessagePayload.replyTo = message.replyTo;
    }

    if (message.replyMessage) {
      const replySender = message.replyMessage.senderId || message.replyMessage.userId;
      chatMessagePayload.replyMessage = {
        _id: message.replyMessage._id,
        messageId: message.replyMessage._id,
        chatId: message.replyMessage.chatId || message.chatId,
        senderId: replySender,
        userId: replySender,
        content: message.replyMessage.content || '',
        type: this.mapMessageTypeToGateway(message.replyMessage.type || 'text'),
        timestamp: message.replyMessage.timestamp || message.replyMessage.updatedAt || new Date().toISOString(),
        urlFile: message.replyMessage.urlFile,
        metadata: message.replyMessage.urlFile ? { urlFile: message.replyMessage.urlFile } : {}
      };
    }

    if (!this.socket.ioSocket?.connected) {
      return;
    }

    /* if (chatMessagePayload.replyTo) {
      // Debug log removed
    } */
    this.socket.emit('newMessageChat', chatMessagePayload);
  }

  private mapMessageTypeToGateway(type: string): 'text' | 'image' | 'file' | 'system' {
    if (!type) return 'text';
    
    const typeMap: { [key: string]: 'text' | 'image' | 'file' | 'system' } = {
      'text': 'text',
      'image': 'image',
      'video': 'image',
      'audio': 'file',
      'file': 'file'
    };
    
    return typeMap[type.toLowerCase()] || 'text';
    }

    ngOnDestroy() {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    this._listenersSetup = false;
    }
}
