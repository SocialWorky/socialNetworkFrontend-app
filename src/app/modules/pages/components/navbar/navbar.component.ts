import { Component, OnInit, OnDestroy, ChangeDetectorRef, Input,  AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription, takeUntil } from 'rxjs';

import { translations } from '@translations/translations'
import { DeviceDetectionService } from '@shared/services/DeviceDetection.service';
import { DropdownDataLink } from '@shared/modules/worky-dropdown/interfaces/dataLink.interface';
import { AuthService } from '@auth/services/auth.service';
import { UserService } from '@shared/services/core-apis/users.service';
import { SocketService } from '@shared/services/socket.service';
import { NotificationUsersService } from '@shared/services/notifications/notificationUsers.service';
import { NotificationService } from '@shared/services/notifications/notification.service';
import { NotificationCenterService } from '@shared/services/core-apis/notificationCenter.service';
import { NotificationPanelService } from '@shared/modules/notifications-panel/services/notificationPanel.service'
import { MessageService } from '../../messages/services/message.service';
import { ConfigService } from '@shared/services/core-apis/config.service';
import { PwaInstallService } from '@shared/services/pwa-install.service';
import { ScrollService } from '@shared/services/scroll.service';
import { Token } from '@shared/interfaces/token.interface';

@Component({
  selector: 'worky-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
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

  scrolledTop = false;

  @Input() isMessages: boolean = false;


  constructor(
    private _router: Router,
    private _deviceDetectionService: DeviceDetectionService,
    private _cdr: ChangeDetectorRef,
    private _authService: AuthService,
    private _userService: UserService,
    private _socketService: SocketService,
    private _notificationUsersService: NotificationUsersService,
    private _notificationService: NotificationService,
    private _notificationCenterService: NotificationCenterService,
    private _messageService: MessageService,
    private _notificationPanelService: NotificationPanelService,
    private _configService: ConfigService,
    private _pwaInstallService: PwaInstallService,
    private _scrollService: ScrollService
  ) {
    this.menuProfile();
    if (!this._authService.isAuthenticated()) return;
    this.token = this._authService.getDecodedToken();
    this._socketService.connectToWebSocket(this.token!);
  }

  ngOnInit() {
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
    this.checkPwaInstall();
    this.getConfig();
    this.checkAdminDataLink();
    this.getUnreadMessagesCount();
    this._cdr.markForCheck();
  }


  ngAfterViewInit(): void {
    this._scrollService.scrollEnd$.pipe(takeUntil(this.unsubscribe$)).subscribe((event) => {
      if (event === 'showNavbar') {
        this.scrolledTop = true;
      } else if (event === 'hideNavbar') {
        this.scrolledTop = false
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

  private removeDataLinkProfile(item: string) {
    this.dataLinkProfile = this.dataLinkProfile.filter((link) => link.title !== item);
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

  private checkAdminDataLink() {
    if (!this._authService.isAuthenticated()) return;
    const dataUser = this._authService.getDecodedToken();
    const link = { icon: 'settings', link: '/admin',  title: 'Administración'}

    if (dataUser && dataUser.role === 'admin' && !this.isMobile) {
      this.dataLinkProfile.unshift(link);
    }
  }

  private checkPwaInstall() {
    if (!this._pwaInstallService.isAppInstalled()) {
      const link = { icon: 'download', function: this.installPWA.bind(this),  title: 'Instalar App'}
      this.dataLinkProfile.unshift(link);
    }
  }

  private installPWA() {
    this._pwaInstallService.showInstallPrompt(
       '🎉 ¡Bienvenido!',
       'Instala nuestra app para una mejor experiencia.'
     );
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
  this.dataLinkProfile = [
    { icon: 'logout', function: this.logoutUser.bind(this),  title: translations['navbar.logout']},
  ];
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

  getNotification() {
    if (!this._authService.isAuthenticated()) return;
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

}
