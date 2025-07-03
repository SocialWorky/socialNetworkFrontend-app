import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil, filter } from 'rxjs';

import { Token } from '@shared/interfaces/token.interface'
import { AuthService } from '@auth/services/auth.service';
import { NotificationCenterService } from '@shared/services/core-apis/notificationCenter.service';
import { NotificationPanelService } from '@shared/modules/notifications-panel/services/notificationPanel.service'
import { NotificationService } from '@shared/services/notifications/notification.service';
import { MessageService } from 'src/app/modules/pages/messages/services/message.service';
import { NotificationMessageChatService } from '@shared/services/notifications/notificationMessageChat.service';

@Component({
    selector: 'worky-sidebar-menu',
    templateUrl: './sidebar-menu.component.html',
    styleUrls: ['./sidebar-menu.component.scss'],
    standalone: false
})
export class SideBarMenuComponent implements OnInit, OnDestroy{
  private unsubscribe$ = new Subject<void>();

  userName: string = '';

  decodedToken!: Token;

  isAuthenticated: boolean = false;

  notifications: number = 0;

  messages: number = 0;

  constructor(
    private _authService: AuthService,
    private _cdr: ChangeDetectorRef,
    private _notificationCenterService: NotificationCenterService,
    private _notificationService: NotificationService,
    private _messageService: MessageService,
    private _notificationPanelService: NotificationPanelService,
    private _notificationMessageChatService: NotificationMessageChatService
  ) { }

  ngOnInit() {
    this.decodedToken = this._authService.getDecodedToken()!;
    this.userName = this.decodedToken.name;
    
    this._notificationService.notification$.pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: () => {
        this.getNotification();
        this.getUnreadMessagesCount();
      },
      error: (error) => {
        console.error('Error getting notifications', error);
      }
    });

    this._notificationMessageChatService.notificationMessageChat$
      .pipe(
        takeUntil(this.unsubscribe$),
        filter((message: any) => message && message._id && message._id !== 'undefined')
      )
      .subscribe({
        next: (message: any) => {
          console.log('Nueva notificación de mensaje recibida:', message);
          this.updateUnreadCountForNewMessage(message);
        },
        error: (error) => {
          console.error('Error en notificación de mensaje:', error);
        }
      });

    this.getNotification();
    this.getUnreadMessagesCount();
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  toggleNotificationsPanel() {
    this._notificationPanelService.togglePanel();
  }

  getNotification() {
    const userId = this._authService.getDecodedToken()?.id!;
    this._notificationCenterService.getNotifications(userId).pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: (data: any) => {
        this.notifications = data.filter((notification: any) => !notification.read).length;
        this._cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error getting notifications', error);
      }
    });
  }

  getUnreadMessagesCount() {
    this._messageService.getUnreadAllMessagesCount().pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: (count: number) => {
        this.messages = count;
        this._cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error getting unread messages count', error);
        this.messages = 0;
        this._cdr.markForCheck();
      }
    });
  }

  forceSyncMessageCount() {
    this._messageService.syncReadStatusFromServer().pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: (count: number) => {
        this.messages = count;
        this._cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error forzando sincronización:', error);
      }
    });
  }

  forceRefreshCounts() {
    this.getNotification();
    this.getUnreadMessagesCount();
  }

  private updateUnreadCountForNewMessage(message: any) {
    const currentUserId = this._authService.getDecodedToken()?.id;
    
    if (!message || !message._id) {
      return;
    }
    
    if (message.senderId !== currentUserId) {
      this.messages++;
      this._cdr.markForCheck();
      this._messageService.syncSpecificMessage(message._id)
        .pipe(takeUntil(this.unsubscribe$))
        .subscribe({
          next: (syncedMessage) => {
            if (syncedMessage) {
              console.log('Mensaje sincronizado exitosamente');
              this.getUnreadMessagesCount();
            } else {
              console.log('No se pudo sincronizar el mensaje');
            }
          },
          error: (error) => {
            console.error('Error sincronizando mensaje específico:', error);
          }
        });
    } else {
      console.log('Mensaje del usuario actual, no se actualiza conteo');
    }
  }

  updateUnreadCountWhenMessagesRead() {
    // Decrementar el conteo local inmediatamente
    if (this.messages > 0) {
      this.messages--;
      this._cdr.markForCheck();
    }
    
    // Luego obtener el conteo exacto del servidor
    this.getUnreadMessagesCount();
  }
}
