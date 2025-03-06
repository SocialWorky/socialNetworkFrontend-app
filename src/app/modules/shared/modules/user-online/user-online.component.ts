import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Token } from '@shared/interfaces/token.interface';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { NotificationUsersService } from '@shared/services/notifications/notificationUsers.service';
import { AuthService } from '@auth/services/auth.service';


@Component({
  selector: 'worky-user-online',
  templateUrl: './user-online.component.html',
  styleUrls: ['./user-online.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserOnlineComponent implements OnInit, AfterViewInit, OnDestroy {
  private _destroy$ = new Subject<void>();

  usersOnline = signal<Token[]>([]);

  currentUser: Token | null = null;

  constructor(
    private _cdr: ChangeDetectorRef,
    private _notificationUsersService: NotificationUsersService,
    private _router: Router,
    private _authService: AuthService
  ) {
    if(!this._authService.isAuthenticated()) return;
    const decodedToken = this._authService.getDecodedToken();
    if (decodedToken && typeof decodedToken === 'object' && 'id' in decodedToken) {
      this.currentUser = decodedToken as Token;
    } else {
      throw new Error('Invalid token');
    }
  }
  ngAfterViewInit(): void {
    this.getUserOnline();
    this._cdr.markForCheck();
  }

  async ngOnInit() {
    this.getUserOnline();
    await this._notificationUsersService.userStatuses$.pipe(
      takeUntil(this._destroy$)
    ).subscribe({
      next: (userStatuses: Token[]) => {
        this.usersOnline.set(userStatuses);
        this._cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error getting user statuses', error);
      }
    });
    this._cdr.markForCheck();
  }

  private getUserOnline() {
    this._notificationUsersService.addCurrentUserStatus(this.currentUser!);
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  goToProfile(_id: string) {
    this._router.navigate(['/profile/', _id]);
  }
}
