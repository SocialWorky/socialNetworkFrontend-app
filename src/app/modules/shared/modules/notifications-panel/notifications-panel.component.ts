import { Component, OnInit, OnDestroy, ChangeDetectorRef, AfterViewInit, HostListener } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';

import { AuthService } from '@auth/services/auth.service';
import { NotificationCenterService } from '@shared/services/core-apis/notificationCenter.service';
import { NotificationService } from '@shared/services/notifications/notification.service';
import { NotificationPanelService } from './services/notificationPanel.service';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { IOSViewportService } from '@shared/services/ios-viewport.service';
import { translations } from '@translations/translations';
import { Colors } from '@shared/interfaces/colors.enum';

import { NotificationsData, AdditionalDataComment, AdditionalDataLike, AdditionalDataFriendRequest, AdditionalDataFriendAccept } from './interfaces/notificationsData.interface';
import { NotificationType, NotificationStatus } from './enums/notificationsType.enum';
import { DropdownDataLink } from '../worky-dropdown/interfaces/dataLink.interface';

@Component({
    selector: 'worky-notifications-panel',
    templateUrl: './notifications-panel.component.html',
    styleUrls: ['./notifications-panel.component.scss'],
    standalone: false
})
export class NotificationsPanelComponent implements OnInit, OnDestroy, AfterViewInit {
  isActive = false;

  currentTab: NotificationStatus = NotificationStatus.UNREAD;

  notificationStatus = NotificationStatus;

  listNotifications: NotificationsData[] = [];

  formatListNotifications: NotificationsData[] = [];

  filteredNotifications: NotificationsData[] = [];

  activeActionId: string | null = null;

  type = NotificationType;

  unreadNotifications: number = 0;

  dataLinkActionsNotifications: DropdownDataLink<any>[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private _authService: AuthService,
    private _notificationCenterService: NotificationCenterService,
    private _cdr: ChangeDetectorRef,
    private _router: Router,
    private _notificationService: NotificationService,
    private _notificationPanelService: NotificationPanelService,
    private _logService: LogService,
    private _iosViewportService: IOSViewportService,
  ) {}

  async ngOnInit() {
    this._notificationPanelService.getIsActive().pipe(takeUntil(this.destroy$)).subscribe(isActive => {
      this.isActive = isActive;
      if (this.isActive) {
        this.getNotifications();
        // Force viewport update for iOS when panel opens
        if (this._iosViewportService.isIOSDevice()) {
          setTimeout(() => {
            this._iosViewportService.forceViewportUpdate();
            // Additional fix for iPhone positioning
            this.fixIPhonePositioning();
          }, 100);
        }
      }
      this._cdr.markForCheck();
    });
  }

  ngAfterViewInit() {
    // Apply positioning fix after view is initialized
    if (this._iosViewportService.isIOSDevice()) {
      setTimeout(() => {
        this.fixIPhonePositioning();
      }, 50);
    }
  }

  @HostListener('window:resize')
  onResize() {
    if (this.isActive && this._iosViewportService.isIOSDevice()) {
      setTimeout(() => {
        this.fixIPhonePositioning();
      }, 100);
    }
  }

  @HostListener('window:orientationchange')
  onOrientationChange() {
    if (this.isActive && this._iosViewportService.isIOSDevice()) {
      setTimeout(() => {
        this._iosViewportService.forceViewportUpdate();
        this.fixIPhonePositioning();
      }, 300);
    }
  }

  private fixIPhonePositioning(): void {
    // Specific fix for iPhone positioning issues
    const notificationPanel = document.querySelector('.notifications-panel') as HTMLElement;
    if (notificationPanel && this._iosViewportService.isIOSDevice()) {
      // Ensure panel starts from the very top
      notificationPanel.style.top = '0';
      notificationPanel.style.marginTop = '0';
      notificationPanel.style.position = 'fixed';
      
      // Set proper height for iPhone
      const height = window.innerHeight;
      notificationPanel.style.height = `${height}px`;
      notificationPanel.style.height = '-webkit-fill-available';
      notificationPanel.style.height = `calc(var(--vh, 1vh) * 100)`;
      
      // Update content body height
      const contentBody = notificationPanel.querySelector('.content-body') as HTMLElement;
      if (contentBody) {
        const headerHeight = 80;
        const bodyHeight = height - headerHeight;
        
        contentBody.style.height = `${bodyHeight}px`;
        contentBody.style.height = `calc(-webkit-fill-available - ${headerHeight}px)`;
        contentBody.style.height = `calc((var(--vh, 1vh) * 100) - ${headerHeight}px)`;
      }
      
      // Ensure header is properly positioned
      const contentHeader = notificationPanel.querySelector('.content-header') as HTMLElement;
      if (contentHeader) {
        contentHeader.style.marginTop = '0';
        contentHeader.style.top = '0';
        contentHeader.style.position = 'relative';
      }
      
      // iPhone positioning fix applied - no need to log every positioning fix
    }
  }

  switchTab(tab: NotificationStatus) {
    this.currentTab = tab;
    this.filterNotifications();
  }

  filterNotifications() {
    if (this.currentTab === 'unread') {
      this.filteredNotifications = this.formatListNotifications.filter(notification => !notification.read);
    } else {
      this.filteredNotifications = [...this.formatListNotifications];
    }
  }

  openActions(notificationId: string, event: MouseEvent) {
    event.stopPropagation();
    this.activeActionId = this.activeActionId === notificationId ? null : notificationId;
  }

  async deleteNotification(notificationId: string) {
    await this._notificationCenterService.deleteNotification(notificationId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.getNotifications();
        this._notificationService.sendNotification();
        this.activeActionId = null;
      },
      error: (error) => {
        const currentUser = this._authService.getDecodedToken();
        this._logService.log(
          LevelLogEnum.ERROR,
          'NotificationsPanelComponent',
          'Error delete notification',
          {
            user: currentUser,
            notificationId,
            message: error,
          },
        );
      },
    });
  }

  checkDataLinkNotifications() {
    this.dataLinkActionsNotifications = [];
    const menuActionsNotifications = {
      icon: 'delete',
      function: this.deleteNotification.bind(this),
      title: translations['notification.deleteNotification_btn'],
      color: Colors.RED
    };

    this.dataLinkActionsNotifications.push(menuActionsNotifications);

    this._cdr.markForCheck();
  }

  handleActionsClickedNotifications(data: DropdownDataLink<any>, notification: any) {
    if (data.function && typeof data.function === 'function') {
      data.function(notification._id);
    } else if (data.link) {
      this._router.navigate([data.link]);
    }
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

        });
        this.formatListNotifications.sort((a, b) => {
          if (a.read === b.read) return 0;
          return a.read && !b.read ? 1 : -1;
        });
        this.filterNotifications();
        this._cdr.markForCheck();
      },
      error: (error) => {
        const currentUser = this._authService.getDecodedToken();
        this._logService.log(
          LevelLogEnum.ERROR,
          'NotificationsPanelComponent',
          'Error get notifications',
          {
            user: currentUser,
            message: error,
          },
        );
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
      next: () => {
        this.getNotifications();
      },
      error: (error) => {
        const currentUser = this._authService.getDecodedToken();
        this._logService.log(
          LevelLogEnum.ERROR,
          'NotificationsPanelComponent',
          'Error mark as read notification',
          {
            user: currentUser,
            notificationId: _id,
            message: error,
          },
        );
      },
    });
  }

  togglePanel() {
    this._notificationPanelService.togglePanel();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
