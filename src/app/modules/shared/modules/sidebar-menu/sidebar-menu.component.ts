import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

import { Token } from '@shared/interfaces/token.interface'
import { AuthService } from '@auth/services/auth.service';
import { NotificationCenterService } from '@shared/services/core-apis/notificationCenter.service';
import { NotificationPanelService } from '@shared/modules/notifications-panel/services/notificationPanel.service'
import { NotificationService } from '@shared/services/notifications/notification.service';
import { MessageService } from 'src/app/modules/pages/messages/services/message.service';

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
    private _notificationPanelService: NotificationPanelService
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
      next: (data: any) => {
        this.messages = data;
        this._cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error getting messages', error);
      }
    });
  }
}
