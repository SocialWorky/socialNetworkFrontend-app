import { Component, OnInit, OnDestroy, ChangeDetectorRef, AfterViewInit, HostListener } from '@angular/core';
import { Subject, firstValueFrom, takeUntil } from 'rxjs';
import { Router } from '@angular/router';

import { AuthService } from '@auth/services/auth.service';
import { NotificationCenterService } from '@shared/services/core-apis/notificationCenter.service';
import { NotificationService } from '@shared/services/notifications/notification.service';
import { NotificationPanelService } from './services/notificationPanel.service';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { IOSViewportService } from '@shared/services/ios-viewport.service';

import { NotificationsData, AdditionalDataComment, AdditionalDataLike, AdditionalDataFriendRequest, AdditionalDataFriendAccept } from './interfaces/notificationsData.interface';
import { NotificationType, NotificationStatus } from './enums/notificationsType.enum';

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
  formatListNotifications: NotificationsData[] = [];
  filteredNotifications: NotificationsData[] = [];
  // Computed only inside filterNotifications() — NOT a getter that runs on every CD cycle
  groupedNotifications: { label: string; items: NotificationsData[] }[] = [];
  type = NotificationType;
  unreadNotifications = 0;
  isSelectMode = false;
  isLoading = false;
  selectedIds = new Set<string>();

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

  get allSelected(): boolean {
    return this.filteredNotifications.length > 0 &&
      this.filteredNotifications.every(n => this.selectedIds.has(n._id));
  }

  get someSelected(): boolean {
    return this.selectedIds.size > 0;
  }

  get selectedCount(): number {
    return this.selectedIds.size;
  }

  // trackBy functions prevent DOM recreation on data refresh
  trackById(_: number, n: NotificationsData): string {
    return n._id;
  }

  trackByLabel(_: number, g: { label: string }): string {
    return g.label;
  }

  ngOnInit() {
    this._notificationPanelService.getIsActive().pipe(takeUntil(this.destroy$)).subscribe(isActive => {
      this.isActive = isActive;
      if (this.isActive) {
        this.getNotifications();
        if (this._iosViewportService.isIOSDevice()) {
          setTimeout(() => {
            this._iosViewportService.forceViewportUpdate();
            this.fixIPhonePositioning();
          }, 100);
        }
      } else {
        this.isSelectMode = false;
        this.selectedIds.clear();
      }
      this._cdr.markForCheck();
    });
  }

  ngAfterViewInit() {
    if (this._iosViewportService.isIOSDevice()) {
      setTimeout(() => this.fixIPhonePositioning(), 50);
    }
  }

  @HostListener('window:resize')
  onResize() {
    if (this.isActive && this._iosViewportService.isIOSDevice()) {
      setTimeout(() => this.fixIPhonePositioning(), 100);
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
    const panel = document.querySelector('.wn-panel') as HTMLElement;
    if (panel && this._iosViewportService.isIOSDevice()) {
      panel.style.top = '0';
      panel.style.marginTop = '0';
      panel.style.position = 'fixed';
      const height = window.innerHeight;
      panel.style.height = `${height}px`;
      panel.style.height = '-webkit-fill-available';
      panel.style.height = `calc(var(--vh, 1vh) * 100)`;
    }
  }

  switchTab(tab: NotificationStatus) {
    this.currentTab = tab;
    this.selectedIds.clear();
    this.filterNotifications();
  }

  filterNotifications() {
    if (this.currentTab === 'unread') {
      this.filteredNotifications = this.formatListNotifications.filter(n => !n.read);
    } else {
      this.filteredNotifications = [...this.formatListNotifications];
    }
    this._computeGroups();
  }

  // Computed here (not in a getter) so arrays are stable between CD cycles
  private _computeGroups(): void {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const weekStart = todayStart - 6 * 86400000;

    const today: NotificationsData[] = [];
    const yesterday: NotificationsData[] = [];
    const thisWeek: NotificationsData[] = [];
    const older: NotificationsData[] = [];

    for (const n of this.filteredNotifications) {
      const t = new Date(n.createdAt).getTime();
      if (t >= todayStart) today.push(n);
      else if (t >= yesterdayStart) yesterday.push(n);
      else if (t >= weekStart) thisWeek.push(n);
      else older.push(n);
    }

    this.groupedNotifications = [
      { label: 'notification.group_today', items: today },
      { label: 'notification.group_yesterday', items: yesterday },
      { label: 'notification.group_week', items: thisWeek },
      { label: 'notification.group_older', items: older },
    ].filter(g => g.items.length > 0);
  }

  toggleSelectMode(): void {
    this.isSelectMode = !this.isSelectMode;
    if (!this.isSelectMode) this.selectedIds.clear();
    this._cdr.markForCheck();
  }

  toggleSelect(id: string): void {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
    this._cdr.markForCheck();
  }

  toggleSelectAll(): void {
    if (this.allSelected) {
      this.selectedIds.clear();
    } else {
      this.filteredNotifications.forEach(n => this.selectedIds.add(n._id));
    }
    this._cdr.markForCheck();
  }

  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  bulkMarkAsRead(): void {
    const ids = [...this.selectedIds].filter(id =>
      this.filteredNotifications.find(n => n._id === id && !n.read)
    );
    if (!ids.length) {
      this.selectedIds.clear();
      this.isSelectMode = false;
      this._cdr.markForCheck();
      return;
    }
    this.isLoading = true;
    this._notificationCenterService.markMultipleAsRead(ids).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        const idSet = new Set(ids);
        this.formatListNotifications.forEach(n => { if (idSet.has(n._id)) n.read = true; });
        this.unreadNotifications = this.formatListNotifications.filter(n => !n.read).length;
        this.selectedIds.clear();
        this.isSelectMode = false;
        this.isLoading = false;
        this.filterNotifications();
        this._notificationService.emitLocalUpdate();
        this._cdr.markForCheck();
      },
      error: () => { this.isLoading = false; this._cdr.markForCheck(); }
    });
  }

  bulkDelete(): void {
    const ids = [...this.selectedIds];
    if (!ids.length) return;
    this.isLoading = true;
    this._notificationCenterService.deleteMultipleNotifications(ids).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        const idSet = new Set(ids);
        const removedUnread = this.formatListNotifications.filter(n => idSet.has(n._id) && !n.read).length;
        this.formatListNotifications = this.formatListNotifications.filter(n => !idSet.has(n._id));
        this.unreadNotifications = Math.max(0, this.unreadNotifications - removedUnread);
        this.selectedIds.clear();
        this.isSelectMode = false;
        this.isLoading = false;
        this.filterNotifications();
        this._notificationService.emitLocalUpdate();
        this._cdr.markForCheck();
      },
      error: () => { this.isLoading = false; this._cdr.markForCheck(); }
    });
  }

  markAllAsRead(): void {
    const userId = this._authService.getDecodedToken()?.id!;
    this._notificationCenterService.markAllAsRead(userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.formatListNotifications.forEach(n => n.read = true);
        this.unreadNotifications = 0;
        this.filterNotifications();
        this._notificationService.emitLocalUpdate();
        this._cdr.markForCheck();
      }
    });
  }

  deleteNotification(notificationId: string) {
    this._notificationCenterService.deleteNotification(notificationId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        const idx = this.formatListNotifications.findIndex(n => n._id === notificationId);
        if (idx !== -1) {
          const wasUnread = !this.formatListNotifications[idx].read;
          this.formatListNotifications.splice(idx, 1);
          if (wasUnread) this.unreadNotifications = Math.max(0, this.unreadNotifications - 1);
        }
        this.filterNotifications();
        this._notificationService.emitLocalUpdate();
        this._cdr.markForCheck();
      },
      error: (error) => {
        this._logService.log(LevelLogEnum.ERROR, 'NotificationsPanelComponent', 'Error delete notification', {
          user: this._authService.getDecodedToken(),
          notificationId,
          message: error,
        });
      },
    });
  }

  // Full HTTP fetch — only called when panel opens for the first time
  getNotifications() {
    const userId = this._authService.getDecodedToken()?.id!;
    this._notificationCenterService.getNotifications(userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: any) => {
        this.unreadNotifications = 0;
        this.formatListNotifications = [];
        response.forEach((notification: NotificationsData) => {
          if (!notification.read) this.unreadNotifications++;

          if (notification.type === this.type.COMMENT) {
            const additionalDataComment: AdditionalDataComment = JSON.parse(notification.additionalData as string);
            this.formatListNotifications.push({ ...notification, icon: 'comment', additionalDataComment });
          } else if (notification.type === this.type.LIKE) {
            const additionalDataLike: AdditionalDataLike = JSON.parse(notification.additionalData as string);
            this.formatListNotifications.push({ ...notification, icon: 'add_reaction', additionalDataLike });
          } else if (notification.type === this.type.FRIEND_REQUEST) {
            const additionalDataFriendRequest: AdditionalDataFriendRequest = JSON.parse(notification.additionalData as string);
            this.formatListNotifications.push({ ...notification, icon: 'person_add', additionalDataFriendRequest });
          } else if (notification.type === this.type.FRIEND_ACCEPTED) {
            const additionalDataFriendAccept: AdditionalDataFriendAccept = JSON.parse(notification.additionalData as string);
            this.formatListNotifications.push({ ...notification, icon: 'how_to_reg', additionalDataFriendAccept });
          }
        });
        this.formatListNotifications.sort((a, b) => {
          if (a.read === b.read) return 0;
          return a.read ? 1 : -1;
        });
        this.filterNotifications();
        this._cdr.markForCheck();
      },
      error: (error) => {
        this._logService.log(LevelLogEnum.ERROR, 'NotificationsPanelComponent', 'Error get notifications', {
          user: this._authService.getDecodedToken(),
          message: error,
        });
      },
    });
  }

  hideEmojiOnError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  isEmojiUrlSafe(url: string | undefined): boolean {
    if (!url) return false;
    const blocked = ['seeklogo.com', 'fbcdn.net'];
    try {
      const host = new URL(url).hostname;
      return !blocked.some(d => host.includes(d));
    } catch {
      return false;
    }
  }

  getNotificationAvatar(notification: NotificationsData): string {
    if (notification.type === this.type.COMMENT) return notification.additionalDataComment?.avatarComment || '';
    if (notification.type === this.type.LIKE) return notification.additionalDataLike?.userAvatarReaction || '';
    if (notification.type === this.type.FRIEND_REQUEST) return notification.additionalDataFriendRequest?.sendUserAvatar || '';
    if (notification.type === this.type.FRIEND_ACCEPTED) return notification.additionalDataFriendAccept?.acceptUserAvatar || '';
    return '';
  }

  getNotificationActorName(notification: NotificationsData): string {
    if (notification.type === this.type.COMMENT) return notification.additionalDataComment?.nameComment || '';
    if (notification.type === this.type.LIKE) return notification.additionalDataLike?.userNameReaction || '';
    if (notification.type === this.type.FRIEND_REQUEST) return notification.additionalDataFriendRequest?.sendUserName || '';
    if (notification.type === this.type.FRIEND_ACCEPTED) return notification.additionalDataFriendAccept?.acceptUserName || '';
    return '';
  }

  // Properly awaits the HTTP call before navigating
  async goToLink(link: string, _id: string) {
    try {
      await firstValueFrom(
        this._notificationCenterService.updateNotification(_id).pipe(takeUntil(this.destroy$))
      );
      const n = this.formatListNotifications.find(x => x._id === _id);
      if (n && !n.read) {
        n.read = true;
        this.unreadNotifications = Math.max(0, this.unreadNotifications - 1);
      }
      this.filterNotifications();
      this._notificationService.emitLocalUpdate();
    } catch {
      // Don't block navigation on mark-as-read failure
    }
    this.togglePanel();
    setTimeout(() => this._router.navigateByUrl(link), 300);
  }

  markAsRead(_id: string) {
    this._notificationCenterService.updateNotification(_id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        const n = this.formatListNotifications.find(x => x._id === _id);
        if (n && !n.read) {
          n.read = true;
          this.unreadNotifications = Math.max(0, this.unreadNotifications - 1);
        }
        this.filterNotifications();
        this._notificationService.emitLocalUpdate();
        this._cdr.markForCheck();
      },
      error: (error) => {
        this._logService.log(LevelLogEnum.ERROR, 'NotificationsPanelComponent', 'Error mark as read notification', {
          user: this._authService.getDecodedToken(),
          notificationId: _id,
          message: error,
        });
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
