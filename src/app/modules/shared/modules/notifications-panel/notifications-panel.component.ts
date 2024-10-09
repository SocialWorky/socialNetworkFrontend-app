import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';

import { AuthService } from '@auth/services/auth.service';
import { NotificationCenterService } from '@shared/services/notificationCenter.service';
import { NotificationPanelService } from './services/notificationPanel.service'
import { AdditionalDataComment, AdditionalDataLike, AdditionalDataFriendRequest, AdditionalDataFriendAccept, NotificationsData } from './interfaces/notificationsData.interface';
import { NotificationType } from './enums/notificationsType.enum';
import { NotificationService } from '@shared/services/notifications/notification.service';

@Component({
  selector: 'worky-notifications-panel',
  templateUrl: './notifications-panel.component.html',
  styleUrls: ['./notifications-panel.component.scss'],
})
export class NotificationsPanelComponent implements OnInit, OnDestroy {
  isActive = false;

  listNotifications: NotificationsData[] = [];

  formatListNotifications: NotificationsData[] = [];

  type = NotificationType;

  unreadNotifications: number = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private _authService: AuthService,
    private _notificationCenterService: NotificationCenterService,
    private _cdr: ChangeDetectorRef,
    private _router: Router,
    private _notificationService: NotificationService,
    private _notificationPanelService: NotificationPanelService,
  ) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit() {
    this._notificationPanelService.getIsActive().pipe(takeUntil(this.destroy$)).subscribe(isActive => {
      this.isActive = isActive;
      if (this.isActive) {
        this.getNotifications();
      }
      this._cdr.markForCheck();
    });
  }

  togglePanel() {
    this._notificationPanelService.togglePanel();
  }

  async getNotifications() {
    const userId = this._authService.getDecodedToken()?.id!;
    this._notificationCenterService.getNotifications(userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: any) => {
        this.unreadNotifications = 0;
        this.formatListNotifications = [];
        response.forEach((notification: NotificationsData) => {
          if (!notification.read) {
            this.unreadNotifications++;
          }

          if (notification.type === this.type.COMMENT) {
            const additionalDataComment: AdditionalDataComment = JSON.parse(notification.additionalData as string);
            notification.icon = 'comment';
            this.formatListNotifications.push({
              ...notification,
              additionalDataComment,
            });
          }

          if (notification.type === this.type.LIKE) {
            const additionalDataLike: AdditionalDataLike = JSON.parse(notification.additionalData as string);
            notification.icon = 'add_reaction';
            this.formatListNotifications.push({
              ...notification,
              additionalDataLike,
            });
          }

          if (notification.type === this.type.FRIEND_REQUEST) {
            const additionalDataFriendRequest: AdditionalDataFriendRequest = JSON.parse(notification.additionalData as string);
            notification.icon = 'person_add';
            this.formatListNotifications.push({
              ...notification,
              additionalDataFriendRequest,
            });
          }

          if (notification.type === this.type.FRIEND_ACCEPTED) {
            const additionalDataFriendAccept: AdditionalDataFriendAccept = JSON.parse(notification.additionalData as string);
            notification.icon = 'person_add';
            this.formatListNotifications.push({
              ...notification,
              additionalDataFriendAccept,
            });
          }

          this.formatListNotifications.sort((a, b) => {
            if (a.read === b.read) {
              return 0;
            } else if (a.read && !b.read) {
              return 1;
            } else {
              return -1;
            }
          });

          this._cdr.markForCheck();
        });
      },
      error: (error) => {
        console.error('Error al obtener las notificaciones:', error);
      },
    });
  }

  async goToLink(link: string, _id: string) {
    await this.markAsRead(_id);
    this._notificationService.sendNotification();
    this.togglePanel();
    setTimeout(() => {
      this._router.navigateByUrl(link);
    }, 1000);
  }

  async markAsRead(_id: string) {
    await this._notificationCenterService.updateNotification(_id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: any) => {
        this.getNotifications();
      },
      error: (error) => {
        console.error('Error al marcar como leida la notificación:', error);
      },
    });
  }
}
