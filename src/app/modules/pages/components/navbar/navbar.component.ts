import { Component, OnInit, OnDestroy, ChangeDetectorRef, Input, Output, EventEmitter, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription, takeUntil } from 'rxjs';

import { translations } from '@translations/translations'
import { DeviceDetectionService } from '@shared/services/device-detection.service';
import { DropdownDataLink } from '@shared/modules/worky-dropdown/interfaces/dataLink.interface';
import { AuthService } from '@auth/services/auth.service';
import { UserService } from '@shared/services/core-apis/users.service';
import { NotificationUsersService } from '@shared/services/notifications/notificationUsers.service';
import { NotificationService } from '@shared/services/notifications/notification.service';
import { NotificationCenterService } from '@shared/services/core-apis/notificationCenter.service';
import { NotificationPanelService } from '@shared/modules/notifications-panel/services/notificationPanel.service'
import { MessageService } from '../../messages/services/message.service';
import { ConfigService } from '@shared/services/core-apis/config.service';

import { ScrollService } from '@shared/services/scroll.service';
import { Token } from '@shared/interfaces/token.interface';
import { AppUpdateManagerService } from '@shared/services/app-update-manager.service';
import { APP_VERSION_CONFIG } from '../../../../../app-version.config';

@Component({
    selector: 'worky-navbar',
    templateUrl: './navbar.component.html',
    styleUrls: ['./navbar.component.scss'],
    standalone: false
})
export class NavbarComponent implements OnInit, OnDestroy, AfterViewInit {
  private unsubscribe$ = new Subject<void>();

  googleLoginSession = localStorage.getItem('googleLogin');

  notifications: number = 0;

  messages: number = 0;

  searchTerm: string = '';

  isMobile: boolean = false;

  dataLinkProfile:DropdownDataLink<any>[] = [];

  resizeSubscription: Subscription | undefined;

  users: any[] = [];

  token: Token | null = null;

  title = 'Social Network App';

  logoUrl = '';

  pwaInstalled = false;

  scrolledTop = true;

  isDarkMode = true;

  @Input() isMessages: boolean = false;
  @Output() navbarStateChange = new EventEmitter<boolean>();

  constructor(
    private _router: Router,
    private _deviceDetectionService: DeviceDetectionService,
    private _cdr: ChangeDetectorRef,
    private _authService: AuthService,
    private _userService: UserService,
    private _notificationUsersService: NotificationUsersService,
    private _notificationService: NotificationService,
    private _notificationCenterService: NotificationCenterService,
    private _messageService: MessageService,
    private _notificationPanelService: NotificationPanelService,
    private _configService: ConfigService,
    private _scrollService: ScrollService,
    private _appUpdateManagerService: AppUpdateManagerService
  ) {
    this.menuProfile();
  }

  async ngOnInit() {

    if (localStorage.getItem('isDarkMode') === 'true') {
      this.isDarkMode = false;
      this.menuProfile();
      this._cdr.markForCheck();
    }

    this.isMobile = this._deviceDetectionService.isMobile();
    this._deviceDetectionService.getResizeEvent().pipe(takeUntil(this.unsubscribe$)).subscribe(() => {
      this.isMobile = this._deviceDetectionService.isMobile();
      this._cdr.markForCheck();
    });
    this._notificationService.notification$.pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: () => {
        setTimeout(() => {
          this.getNotification();
          this.getUnreadMessagesCount();
        }, 1000)
      },
      error: (error) => {
        console.error('Error getting notifications', error);
      }
    });
    this.subscribeToConfig();
    this.getConfig();
    this.checkAdminDataLink();
    this.getUnreadMessagesCount();
    this._cdr.markForCheck();
  }


  ngAfterViewInit(): void {
    this._scrollService.scrollEnd$.pipe(takeUntil(this.unsubscribe$)).subscribe((event) => {
      // Only process navbar events on mobile devices
      if (this.isMobile && (event === 'showNavbar' || event === 'hideNavbar')) {
        if (event === 'showNavbar') {
          this.scrolledTop = true;
          this.navbarStateChange.emit(true);
          this._cdr.markForCheck();
        } else if (event === 'hideNavbar') {
          this.scrolledTop = false;
          this.navbarStateChange.emit(false);
          this._cdr.markForCheck();
        }
      }
    });
  }

  getConfig() {
    this._configService.getConfig().pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: (data: any) => {
        this.applyConfig(data);
        this._cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error getting config', error);
      }
    });
  }

  private subscribeToConfig() {
    this._configService.config$.pipe(takeUntil(this.unsubscribe$)).subscribe((configData) => {
      if (configData) {
        this.applyConfig(configData);
      }
    });
  }

  private applyConfig(configData: any) {
    if (configData) {
      this.title = configData.settings.title;
      this.logoUrl = configData.settings.logoUrl;
      this._cdr.markForCheck();
    }
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  private logoutUser() {
   this._notificationUsersService.logoutUser();
   this._authService.logout();
  }

  private async checkAdminDataLink() {
    const dataUser = this._authService.getDecodedToken();
    const link = { icon: 'settings', link: '/admin',  title: 'Administración'}

    if (dataUser && dataUser.role === 'admin' && !this.isMobile) {
      this.dataLinkProfile.unshift(link);
    }
  }

  toggleNotificationsPanel() {
    this._notificationPanelService.togglePanel();
  }

  search(event: Event) {
    if (this.searchTerm.trim().length >= 3) {
      this._userService.getUserByName(this.searchTerm).pipe(takeUntil(this.unsubscribe$)).subscribe((data: any) => {
        this.users = data;
      });
    } else {
      this.users = [];
      this._cdr.markForCheck();
    }
  }

  onInputChange(event: Event) {
    if (this.searchTerm.trim().length >= 3) {
      this.search(event);
    } else {
      this.users = [];
      this._cdr.markForCheck();
    }
  }

  onEnter(event: any) {
    if (event.key === 'Enter' && this.searchTerm.trim().length >= 3) {
      this.search(event);
    }
  }

  menuProfile() {
  let iconMode = 'light_mode';
  if (this.isDarkMode) {
    iconMode = 'dark_mode';
  } else {
    iconMode = 'light_mode';
  }
  this.dataLinkProfile = [
    { icon: iconMode, function: () => this.toggleDarkMode(this.isDarkMode), title: this.isDarkMode ? 'modo oscuro' : 'modo claro' },
    { icon: 'system_update', function: () => this.checkForUpdates(), title: translations['navbar.checkUpdates']},
    { icon: 'logout', function: this.logoutUser.bind(this),  title: translations['navbar.logout']},
    { function: undefined, title: `${translations['navbar.version']} ${APP_VERSION_CONFIG.version}`, isVersionInfo: true },
  ];
}

  checkForUpdates() {
    this._appUpdateManagerService.forceCheckForUpdates();
  }

  handleLinkClicked(data: DropdownDataLink<any>) {
    if (data.function) {
      if (typeof data.function === 'function') {
        data.function();
      }
    }
    if (data.link) {
      this._router.navigate([data.link]);
    }
  }

  viewProfile(_id: string) {
    this._router.navigate(['/profile', _id]);
    this.users = [];
    this.searchTerm = '';
  }

  async getNotification() {
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

  messagesUrl() {
    this._router.navigate(['/messages']);
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

  toggleDarkMode(isDarkMode: boolean) {
    const body = document.body;
    const userId = this._authService.getDecodedToken()?.id!;
    if (isDarkMode) {
      body.classList.add('dark-mode');
      localStorage.setItem('isDarkMode', 'true');
      this._userService.userEdit(userId, { isDarkMode: true }).pipe(takeUntil(this.unsubscribe$)).subscribe({});
    } else {
      localStorage.setItem('isDarkMode', 'false');
      body.classList.remove('dark-mode');
      this._userService.userEdit(userId, { isDarkMode: false }).pipe(takeUntil(this.unsubscribe$)).subscribe({});
    }

    this.isDarkMode = !isDarkMode;
    this.menuProfile();
    this.checkAdminDataLink();
    this._cdr.markForCheck();

  }

}
