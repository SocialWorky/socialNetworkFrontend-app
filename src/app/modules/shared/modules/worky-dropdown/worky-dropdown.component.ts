import { ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { AuthService } from '@auth/services/auth.service';
import { DropdownDataLink } from './interfaces/dataLink.interface';
import { GlobalEventService } from '@shared/services/globalEventService.service';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { UserService } from '@shared/services/users.service';
import { User } from '@shared/interfaces/user.interface';
import { Token } from '@shared/interfaces/token.interface';

@Component({
  selector: 'worky-dropdown',
  templateUrl: './worky-dropdown.component.html',
  styleUrls: ['./worky-dropdown.component.scss'],
})
export class WorkyDropdownComponent  implements OnInit, OnDestroy{

  profileImageUrl: string | null = '';

  user: User = {} as User;

  decodedToken!: Token;

  private subscription: Subscription | undefined;

  private unsubscribe$ = new Subject<void>();

  @Input() icon: string | undefined;

  @Input() badge?: boolean = false;

  @Input() badgeValue?: number | null | undefined = 0;

  @Input() dataLink?: DropdownDataLink<any>[] = [];

  @Input() img?: string | boolean = undefined;

  @Input() title?: string | undefined;

  @Output() linkClicked: EventEmitter<DropdownDataLink<any>> = new EventEmitter<DropdownDataLink<any>>();

  constructor(
    private _authService: AuthService,
    private _globalEventService: GlobalEventService,
    private _userService: UserService,
    private _cdr: ChangeDetectorRef,
  ) { 
    this.decodedToken = this._authService.getDecodedToken()!;
  }

  ngOnInit() {
    this.getUser();
    this.subscription = this._globalEventService.profileImage$.subscribe(newImageUrl => {
      this.profileImageUrl = newImageUrl;
    });
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  handleMenuItemClick(data: DropdownDataLink<any>) {
    this.linkClicked.emit(data);
  }

  async getUser() {
    await this._userService.getUserById(this.decodedToken.id).pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: (response: User) => {
        this.user = response;
        this.profileImageUrl = response.avatar;
        this._cdr.markForCheck();
      },
      error: (error) => {
        console.error(error);
      },
    });
  }

}
