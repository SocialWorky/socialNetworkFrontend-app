import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription, takeUntil } from 'rxjs';

import { translations } from '@translations/translations'
import { DeviceDetectionService } from '@shared/services/DeviceDetection.service';
import { DropdownDataLink } from '@shared/modules/worky-dropdown/interfaces/dataLink.interface';
import { AuthService } from '@auth/services/auth.service';
import { UserService } from '@shared/services/users.service';
import { SocketService } from '@shared/services/socket.service';
import { NotificationUsersService } from '@shared/services/notifications/notificationUsers.service';
import { NotificationService } from '@shared/services/notifications/notification.service';
import { NotificationCenterService } from '@shared/services/notificationCenter.service';

@Component({
  selector: 'worky-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent implements OnInit, OnDestroy {
  private unsubscribe$ = new Subject<void>();

  googleLoginSession = localStorage.getItem('googleLogin');

  notifications: number = 0;

  messages: number = 0;

  searchTerm: string = '';

  isMobile: boolean = false;

  dataLinkProfile:DropdownDataLink<any>[] = [];

  resizeSubscription: Subscription | undefined;

  users: any[] = [];

  token = this._authService.getDecodedToken();

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
  ) {
    this.menuProfile();
    this.token = this._authService.getDecodedToken();
    this._socketService.connectToWebSocket(this.token);
  }

  ngOnInit() {
    this.isMobile = this._deviceDetectionService.isMobile();
    this._deviceDetectionService.getResizeEvent().pipe(takeUntil(this.unsubscribe$)).subscribe(() => {
      this.isMobile = this._deviceDetectionService.isMobile();
      this._cdr.markForCheck();
    });
    this._notificationService.notification$.pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: () => {
        this.getNotification();
        this._cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error getting notifications', error);
      }
    });
    this.checkAdminDataLink();
    this._cdr.markForCheck();
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  logoutUser() {
   this._notificationUsersService.logoutUser();
   this._authService.logout();
  }

  checkAdminDataLink() {
    const dataUser = this._authService.getDecodedToken();
    const link = { icon: 'settings', link: '/admin',  title: 'Administración'}

    if (dataUser && dataUser.role === 'admin' && !this.isMobile) {
      this.dataLinkProfile.push(link);
    }
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
    // { link: '/auth/login',  title: 'Perfil' },
    // { link: '/settings',  title: 'Configuración' },
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

  async getNotification() {
    const userId = await this._authService.getDecodedToken().id;
    await this._notificationCenterService.getNotifications(userId).pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: (data: any) => {
        this.notifications = data.filter((notification: any) => !notification.read).length;
        this.messages = data.filter((notification: any) => notification.type === 'message' && !notification.read).length;
        this._cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error getting notifications', error);
      }
    });
  }

}
