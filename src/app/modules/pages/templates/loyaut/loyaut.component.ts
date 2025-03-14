import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';

import { DeviceDetectionService } from '@shared/services/DeviceDetection.service';
import { AuthService } from '@auth/services/auth.service';
import { NotificationUsersService } from '@shared/services/notifications/notificationUsers.service';
import { ScrollService } from '@shared/services/scroll.service';

@Component({
  selector: 'worky-loyaut',
  templateUrl: './loyaut.component.html',
  styleUrls: ['./loyaut.component.scss'],
})
export class LoyautComponent implements OnInit, OnDestroy {

  routeUrl: string = '';
  isProfile: boolean = false;
  isMessages: boolean = false;

  private routeSub: Subscription | undefined;

  get isMobile(): boolean {
    return this._deviceDetectionService.isMobile();
  }

  get token() {
    this._authService.getDecodedToken();
    return this._authService.getDecodedToken();
  }

  get isAuthenticated(): boolean {
    return !!this.token;
  }

  constructor(
    private _deviceDetectionService: DeviceDetectionService,
    private _router: Router,
    private _cdr: ChangeDetectorRef,
    private _authService: AuthService,
    private _notificationUsersService: NotificationUsersService,
    private _scrollService: ScrollService
  ) {}

  ngOnInit(): void {
    this._authService.getDecodedToken();
    this._notificationUsersService.refreshUserStatuses();
    this.routeSub = this._router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd)
      )
      .subscribe((event: NavigationEnd) => {
        this.routeUrl = event.url;
        this.isProfile = this.routeUrl.includes('profile');
        this.isMessages = this.routeUrl.includes('messages');
        this._cdr.markForCheck();
      });

    this.routeUrl = this._router.url;
    this.isProfile = this.routeUrl.includes('profile');
    this.isMessages = this.routeUrl.includes('messages');
    this._cdr.markForCheck();
  }

  ngOnDestroy(): void {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
  }

  onScroll(event: any) {
    this._scrollService.onScroll(event);
    if(!this.isMobile) return;
    const threshold = 100;
    const position = event.target.scrollTop + event.target.clientHeight;
    const height = event.target.scrollHeight;

    if (position >= height - threshold) {
      this._scrollService.notifyScrollEnd();
    }
  }
}
