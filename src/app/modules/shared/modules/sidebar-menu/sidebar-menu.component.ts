import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subject, Subscription, takeUntil } from 'rxjs';

import { Token } from '@shared/interfaces/token.interface'
import { AuthService } from '@auth/services/auth.service';
import { NotificationCenterService } from '@shared/services/notificationCenter.service';
import { NotificationsPanelComponent } from '../notifications-panel/notifications-panel.component';
import { NotificationService } from '@shared/services/notifications/notification.service';
import { MessageService } from 'src/app/modules/pages/messages/services/message.service';

@Component({
  selector: 'worky-sidebar-menu',
  templateUrl: './sidebar-menu.component.html',
  styleUrls: ['./sidebar-menu.component.scss'],
})
export class SideBarMenuComponent implements OnInit, OnDestroy{
  private unsubscribe$ = new Subject<void>();

  userName: string = '';

  decodedToken!: Token;

  isAuthenticated: boolean = false;

  @ViewChild('notificationsPanel')
  notificationsPanel!: NotificationsPanelComponent;

  notifications: number = 0;

  messages: number = 0;

  constructor(
    private _authService: AuthService,
    private _cdr: ChangeDetectorRef,
    private _notificationCenterService: NotificationCenterService,
    private _notificationService: NotificationService,
    private _messageService: MessageService
  ) { 
    this.isAuthenticated = this._authService.isAuthenticated();
    if (this.isAuthenticated) {
      this.decodedToken = this._authService.getDecodedToken()!;
      this.userName = this.decodedToken.name;
    }
  }

  ngOnInit() {
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

  toggleNotificationsPanel(event: Event): void {
    event.preventDefault(); // Evita que la página se recargue si usas un <a> con href="#"
    if (this.notificationsPanel) {
      this.notificationsPanel.togglePanel();
    }
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
