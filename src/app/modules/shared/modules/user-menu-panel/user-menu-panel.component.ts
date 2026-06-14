import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

import { AuthService } from '@auth/services/auth.service';
import { UtilityService } from '@shared/services/utility.service';
import { DropdownDataLink } from '@shared/modules/worky-dropdown/interfaces/dataLink.interface';
import { environment } from '@env/environment';
import { IOSViewportService } from '@shared/services/ios-viewport.service';
import { UserMenuPanelService } from './services/userMenuPanel.service';

/**
 * Slide-in side panel for the user/account menu, mirroring the notifications
 * panel pattern. The action items are provided by the navbar (admin, theme,
 * updates, logout, version) and new sections can be added here over time.
 */
@Component({
  selector: 'worky-user-menu-panel',
  templateUrl: './user-menu-panel.component.html',
  styleUrls: ['./user-menu-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class UserMenuPanelComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() navItems: DropdownDataLink<any>[] = [];

  @Input() items: DropdownDataLink<any>[] = [];

  @Output() itemClick = new EventEmitter<DropdownDataLink<any>>();

  /** Main actions stay at the top; logout and version are pinned to the footer. */
  get mainItems(): DropdownDataLink<any>[] {
    return this.items.filter((i) => !i.isVersionInfo && i.icon !== 'logout');
  }

  get logoutItem(): DropdownDataLink<any> | undefined {
    return this.items.find((i) => i.icon === 'logout');
  }

  get versionItem(): DropdownDataLink<any> | undefined {
    return this.items.find((i) => i.isVersionInfo);
  }

  isActive = false;
  userName = '';
  userHandle = '';
  userAvatar: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private _userMenuPanelService: UserMenuPanelService,
    private _authService: AuthService,
    private _utilityService: UtilityService,
    private _iosViewportService: IOSViewportService,
    private _cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this._userMenuPanelService
      .getIsActive()
      .pipe(takeUntil(this.destroy$))
      .subscribe((isActive) => {
        this.isActive = isActive;
        if (isActive) {
          this.loadUser();
          // iOS PWA: -webkit-fill-available can be shorter than the screen, leaving a
          // gap at the bottom. Force the real viewport height like the notifications panel.
          if (this._iosViewportService.isIOSDevice()) {
            setTimeout(() => {
              this._iosViewportService.forceViewportUpdate();
              this.fixIPhonePositioning();
            }, 100);
          }
        }
        this._cdr.markForCheck();
      });
  }

  ngAfterViewInit(): void {
    if (this._iosViewportService.isIOSDevice()) {
      setTimeout(() => this.fixIPhonePositioning(), 50);
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.isActive && this._iosViewportService.isIOSDevice()) {
      setTimeout(() => this.fixIPhonePositioning(), 100);
    }
  }

  @HostListener('window:orientationchange')
  onOrientationChange(): void {
    if (this.isActive && this._iosViewportService.isIOSDevice()) {
      setTimeout(() => {
        this._iosViewportService.forceViewportUpdate();
        this.fixIPhonePositioning();
      }, 300);
    }
  }

  private fixIPhonePositioning(): void {
    const panel = document.querySelector('.ump-panel') as HTMLElement | null;
    if (panel && this._iosViewportService.isIOSDevice()) {
      panel.style.top = '0';
      panel.style.position = 'fixed';
      panel.style.height = `${window.innerHeight}px`;
      panel.style.height = `calc(var(--vh, 1vh) * 100)`;
    }
  }

  private loadUser(): void {
    const token = this._authService.getDecodedToken();
    this.userName = token?.name || '';
    this.userHandle = token?.username || '';
    this.userAvatar = token?.avatar
      ? this._utilityService.normalizeImageUrl(token.avatar, environment.MINIO_BUCKET_URL || '')
      : null;
  }

  onItem(item: DropdownDataLink<any>): void {
    if (item.isVersionInfo) return;
    this.itemClick.emit(item);
    this.close();
  }

  close(): void {
    this._userMenuPanelService.setPanelState(false);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
