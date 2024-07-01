import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Token } from '@shared/interfaces/token.interface';
import { Subject, takeUntil } from 'rxjs';

import { NotificationUsersService } from '@shared/services/notifications/notificationUsers.service';
import { AuthService } from '@auth/services/auth.service';

@Component({
  selector: 'worky-user-online',
  templateUrl: './user-online.component.html',
  styleUrls: ['./user-online.component.scss'],
})
export class UserOnlineComponent  implements OnInit, OnDestroy {
  private _destroy$ = new Subject<void>();

  usersOnline: Token[] | undefined;

  currenUser = this._authService.getDecodedToken();

  constructor(
    private _cdr: ChangeDetectorRef,
    private _notificationUsersService: NotificationUsersService,
    private _router: Router,
    private _authService: AuthService
  ) {}

  ngOnInit() {
    this._notificationUsersService.userStatuses$.pipe(
      takeUntil(this._destroy$)
    ).subscribe({
      next: (userStatuses) => {
        setTimeout(() => {
          this.usersOnline = userStatuses[0];
          this._cdr.markForCheck();
        }, 1000);
      },
      error: (error) => {
        console.error('Error getting user statuses', error);
      }
    })
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  goToProfile(_id: string) {
    this._router.navigate(['/profile/', _id]);
  }

}
