import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, Output, EventEmitter, ElementRef, Renderer2, ChangeDetectorRef } from '@angular/core';
import { ImageLoadOptions } from '../../services/image.service';
import { firstValueFrom, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ActionSheetController } from '@ionic/angular';

import { AuthService } from '@auth/services/auth.service';
import { GlobalEventService } from '@shared/services/globalEventService.service';
import { UserService } from '@shared/services/core-apis/users.service';
import { User } from '@shared/interfaces/user.interface';
import { Token } from '@shared/interfaces/token.interface';
import { DropdownDataLink } from '@shared/modules/worky-dropdown/interfaces/dataLink.interface';
import { DeviceDetectionService } from '@shared/services/device-detection.service';

@Component({
    selector: 'worky-dropdown',
    templateUrl: './worky-dropdown.component.html',
    styleUrls: ['./worky-dropdown.component.scss'],
    standalone: false
})
export class WorkyDropdownComponent implements OnInit, OnDestroy {
  @Input() icon?: string;

  @Input() badge: boolean = false;

  @Input() badgeValue: number | null = 0;

  @Input() dataLink: DropdownDataLink<any>[] = [];

  @Input() img: string | boolean = '';

  @Input() size?: number = 50;

  @Input() title?: string;

  @Input() isFilled?: boolean = false;

  @Input() isMenu?: boolean = true;

  @Input() menuTitle?: string;
  imageOptions: ImageLoadOptions = {
    maxRetries: 2,
    retryDelay: 1000,
    timeout: 10000,
    fallbackUrl: '/assets/images/placeholder.jpg'
  };

  @Output() linkClicked = new EventEmitter<DropdownDataLink<any>>();

  profileImageUrl: string | null = '';

  user: User = {} as User;

  decodedToken: Token;

  loaderAvatar = false;

  dropdownDirection?: 'up' | 'down';

  isMobile: boolean = this._deviceDetectionService.isMobile();

  private unsubscribe$ = new Subject<void>();

  constructor(
    private _authService: AuthService,
    private _globalEventService: GlobalEventService,
    private _userService: UserService,
    private _cdr: ChangeDetectorRef,
    private _elementRef: ElementRef,
    private _renderer: Renderer2,
    private _deviceDetectionService: DeviceDetectionService,
    private _actionSheetController: ActionSheetController
  ) {
    this.decodedToken = this._authService.getDecodedToken()!;
  }

  ngOnInit() {
    if (this.img === 'avatar') this.getUser();
    this._globalEventService.profileImage$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(newImageUrl => {
        this.profileImageUrl = newImageUrl;
        this._cdr.markForCheck();
      });
    this.checkDropdownDirection();
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  handleMenuItemClick(data: DropdownDataLink<any>) {
    this.linkClicked.emit(data);
  }

  async getUser() {
    try {
      this.loaderAvatar = true;
      const response = await firstValueFrom(this._userService.getUserById(this.decodedToken.id).pipe(takeUntil(this.unsubscribe$)));
      if (response) {
        this.user = response;
        this.profileImageUrl = response.avatar;
        this.loaderAvatar = false;
        this._cdr.markForCheck();
      } else {
        this.loaderAvatar = false;
        console.error('User not found');
      }
    } catch (error) {
      this.loaderAvatar = false;
      console.error(error);
    }
  }

  checkDropdownDirection() {
    const rect = this._elementRef.nativeElement.getBoundingClientRect();
    const container = this.getScrollContainer();
    const containerRect = container.getBoundingClientRect();
    const containerScrollTop = container.scrollTop;

    const containerHeight = container.clientHeight;

    const threshold = 200;

    const distanceFromBottom =
      containerHeight - (rect.bottom - containerRect.top) + containerScrollTop;

    if (distanceFromBottom < threshold) {
      this.dropdownDirection = 'up';
      this._renderer.setAttribute(
        this._elementRef.nativeElement,
        'data-direction',
        this.dropdownDirection
      );
      this._cdr.markForCheck();
    } else {
      this.dropdownDirection = 'down';
      this._renderer.setAttribute(
        this._elementRef.nativeElement,
        'data-direction',
        this.dropdownDirection
      );
      this._cdr.markForCheck();
    }
  }

  private getScrollContainer(): HTMLElement {
    if (document.documentElement.scrollHeight > window.innerHeight) {
      return document.documentElement;
    }

    let parent = this._elementRef.nativeElement.parentElement;
    while (parent) {
      if (parent.scrollHeight > parent.clientHeight) {
        return parent;
      }
      parent = parent.parentElement;
    }

    return document.documentElement;
  }

  async showMobileMenu() {
    const buttons = this.dataLink.map((data) => ({
      text: data.title,
      icon: this.mapIconToIonic(data.icon || 'help'),
      ...(data.img ? { icon: data.img } : {}),
      handler: () => this.handleMenuItemClick(data),
    }));

    buttons.push({
      text: 'Cancelar',
      icon: 'close',
      handler: () => {},
    });

    const actionSheet = await this._actionSheetController.create({
      header: this.menuTitle || 'Menú',
      cssClass: 'dropdown-menu-mobile',
      translucent: true,
      buttons: buttons,
    });

    await actionSheet.present();
  }

  private mapIconToIonic(iconName: string): string {
    const iconMapping: { [key: string]: string } = {
      // Material Symbols Rounded -> Ionicons
      'download': 'download-outline',
      'logout': 'log-out-outline',
      'cancel': 'close-outline',
      'settings': 'settings-outline',
      'person': 'person-outline',
      'favorite': 'heart-outline',
      'edit': 'create-outline',
      'delete': 'trash-outline',
      'share': 'share-outline',
      'search': 'search-outline',
      'add': 'add-outline',
      'remove': 'remove-outline',
      'check': 'checkmark-outline',
      'arrow_upward': 'arrow-up-outline',
      'arrow_downward': 'arrow-down-outline',
      'arrow_forward': 'arrow-forward-outline',
      'arrow_back': 'arrow-back-outline',
      'push_pin': 'locate-outline',
      'report':'alert-outline',
      'dark_mode': 'moon-outline',
      'light_mode': 'sunny-outline',
    };

    return iconMapping[iconName] || 'help-outline';
  }

}
