import { ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output, ElementRef, Renderer2 } from '@angular/core';
import { AuthService } from '@auth/services/auth.service';
import { DropdownDataLink } from './interfaces/dataLink.interface';
import { GlobalEventService } from '@shared/services/globalEventService.service';
import { Subject } from 'rxjs';
import { UserService } from '@shared/services/core-apis/users.service';
import { User } from '@shared/interfaces/user.interface';
import { Token } from '@shared/interfaces/token.interface';
import { takeUntil } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

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

  @Output() linkClicked = new EventEmitter<DropdownDataLink<any>>();

  profileImageUrl: string | null = '';

  user: User = {} as User;

  decodedToken: Token;

  loaderAvatar = false;

  dropdownDirection?: 'up' | 'down';

  private unsubscribe$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private globalEventService: GlobalEventService,
    private userService: UserService,
    private cdr: ChangeDetectorRef,
    private elementRef: ElementRef,
    private renderer: Renderer2
  ) {
    this.decodedToken = this.authService.getDecodedToken()!;
  }

  ngOnInit() {
    if (this.img === 'avatar') this.getUser();
    this.globalEventService.profileImage$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(newImageUrl => {
        this.profileImageUrl = newImageUrl;
        this.cdr.markForCheck();
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
      const response = await firstValueFrom(this.userService.getUserById(this.decodedToken.id).pipe(takeUntil(this.unsubscribe$)));
      if (response) {
        this.user = response;
        this.profileImageUrl = response.avatar;
        this.loaderAvatar = false;
        this.cdr.markForCheck();
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
    const rect = this.elementRef.nativeElement.getBoundingClientRect();
    const container = this.getScrollContainer();
    const containerRect = container.getBoundingClientRect();
    const containerScrollTop = container.scrollTop;

    const containerHeight = container.clientHeight;

    const threshold = 200;

    const distanceFromBottom =
      containerHeight - (rect.bottom - containerRect.top) + containerScrollTop;

    if (distanceFromBottom < threshold) {
      this.dropdownDirection = 'up';
      this.renderer.setAttribute(
        this.elementRef.nativeElement,
        'data-direction',
        this.dropdownDirection
      );
      this.cdr.markForCheck();
    } else {
      this.dropdownDirection = 'down';
      this.renderer.setAttribute(
        this.elementRef.nativeElement,
        'data-direction',
        this.dropdownDirection
      );
      this.cdr.markForCheck();
    }
  }

  private getScrollContainer(): HTMLElement {
    if (document.documentElement.scrollHeight > window.innerHeight) {
      return document.documentElement;
    }

    let parent = this.elementRef.nativeElement.parentElement;
    while (parent) {
      if (parent.scrollHeight > parent.clientHeight) {
        return parent;
      }
      parent = parent.parentElement;
    }

    return document.documentElement;
  }
}
