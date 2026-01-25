import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '@auth/services/auth.service';
import { Token } from '@shared/interfaces/token.interface';
import { NotificationCenterService } from '@shared/services/core-apis/notificationCenter.service';
import { NotificationService } from '@shared/services/notifications/notification.service';
import { NotificationPanelService } from '@shared/modules/notifications-panel/services/notificationPanel.service';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { GlobalEventService } from '@shared/services/globalEventService.service';
import { UserService } from '@shared/services/core-apis/users.service';
import { UtilityService } from '@shared/services/utility.service';
import { environment } from '@env/environment';

@Component({
  selector: 'worky-sidebar-menu',
  templateUrl: './sidebar-menu.component.html',
  styleUrls: ['./sidebar-menu.component.scss'],
  standalone: false
})
export class SideBarMenuComponent implements OnInit, OnDestroy{
  private unsubscribe$ = new Subject<void>();

  userName: string = '';
  userAvatar: string = '';
  userFullName: string = '';

  decodedToken!: Token;

  isAuthenticated: boolean = false;

  notifications: number = 0;

  constructor(
    private _authService: AuthService,
    private _cdr: ChangeDetectorRef,
    private _notificationCenterService: NotificationCenterService,
    private _notificationService: NotificationService,
    private _notificationPanelService: NotificationPanelService,
    private _logService: LogService,
    private _globalEventService: GlobalEventService,
    private _userService: UserService,
    private _utilityService: UtilityService
  ) { }

  ngOnInit() {
    this.decodedToken = this._authService.getDecodedToken()!;
    this.userName = this.decodedToken.username;
    // Normalize avatar URL from token
    this.userAvatar = this.decodedToken.avatar ? this._utilityService.normalizeImageUrl(this.decodedToken.avatar, environment.MINIO_BUCKET_URL || '') : '';
    this.userFullName = this.decodedToken.name || '';
    
    // Subscribe to profile image updates - normalize URL
    this._globalEventService.profileImage$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(newImageUrl => {
        if (newImageUrl) {
          this.userAvatar = this._utilityService.normalizeImageUrl(newImageUrl, environment.MINIO_BUCKET_URL || '');
          this._cdr.markForCheck();
        }
      });
    
    // Get fresh user data
    this.getFreshUserData();
    
    this._authService.isAuthenticated().then(isAuth => {
      this.isAuthenticated = isAuth;
    });

    this.getNotification();
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  private async getFreshUserData(): Promise<void> {
    try {
      if (this.decodedToken?.id) {
        const freshUserData = await this._userService.getUserById(this.decodedToken.id).toPromise();
        if (freshUserData) {
          // Normalize avatar URL from fresh user data
          this.userAvatar = freshUserData.avatar ? this._utilityService.normalizeImageUrl(freshUserData.avatar, environment.MINIO_BUCKET_URL || '') : '';
          this.userFullName = freshUserData.name + ' ' + freshUserData.lastName || '';
          this.userName = freshUserData.username || '';
          this._cdr.markForCheck();
        }
      }
    } catch (error) {
      this._logService.log(LevelLogEnum.ERROR, 'SideBarMenuComponent', 'Error getting fresh user data', { error });
    }
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
        this._logService.log(
          LevelLogEnum.ERROR,
          'SideBarMenuComponent',
          'Error getting notifications',
          { error: String(error) }
        );
      }
    });
  }
}
