import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Token } from '@shared/interfaces/token.interface';
import { Subject, interval } from 'rxjs';
import { takeUntil, catchError, switchMap, startWith, distinctUntilChanged, debounceTime } from 'rxjs/operators';
import { NotificationUsersService } from '@shared/services/notifications/notificationUsers.service';
import { AuthService } from '@auth/services/auth.service';
import { UtilityService } from '@shared/services/utility.service';
import { computed, effect } from '@angular/core';

@Component({
  selector: 'worky-user-online',
  templateUrl: './user-online.component.html',
  styleUrls: ['./user-online.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserOnlineComponent implements OnInit, OnDestroy {
  private readonly _destroy$ = new Subject<void>();

  private readonly REFRESH_INTERVAL = 30000;

  usersOnline = signal<Token[]>([]);

  isLoading = signal<boolean>(false);

  error = signal<string | null>(null);

  currentUser: Token | null = null;

  filteredUsers = computed(() => {
    return this.usersOnline().filter(user => user.status !== 'offLine');
  });

  onlineCount = computed(() => {
    return this.filteredUsers().length;
  });

  constructor(
    private _cdr: ChangeDetectorRef,
    private _notificationUsersService: NotificationUsersService,
    private _router: Router,
    private _authService: AuthService,
    private _utilityService: UtilityService
  ) {
    this.checkAndInitializeUser();

    effect(() => {
      const users = this.filteredUsers();
      if (users.length > 0) {
        this._cdr.detectChanges();
      }
    });
  }

  private checkAndInitializeUser(): void {
    if (!this._authService.isAuthenticated()) {
      this._router.navigate(['/login']);
      return;
    }

    try {
      const decodedToken = this._authService.getDecodedToken();
      if (decodedToken && typeof decodedToken === 'object' && 'id' in decodedToken) {
        this.currentUser = decodedToken as Token;
      } else {
        throw new Error('Invalid token format');
      }
    } catch (error) {
      console.error('Error initializing user:', error);
      this._authService.logout();
      this._router.navigate(['/login']);
    }
  }

  async ngOnInit() {
    this.isLoading.set(true);
    await this._utilityService.sleep(1000);
    if (!this.currentUser) return;

    interval(this.REFRESH_INTERVAL).pipe(
      startWith(0),
      switchMap(() => this._notificationUsersService.userStatuses$),
      distinctUntilChanged((prev: Token[], curr: Token[]) =>
        JSON.stringify(prev) === JSON.stringify(curr)
      ),
      debounceTime(300),
      catchError((error) => {
        this.error.set('Failed to fetch online users');
        console.error('Error fetching user statuses:', error);
        return [];
      }),
      takeUntil(this._destroy$)
    ).subscribe((userStatuses: Token[]) => {
      this.usersOnline.set(userStatuses);
      this.isLoading.set(false);
      this.error.set(null);
    });

    this.getUserOnline();
  }

  private getUserOnline(): void {
    if (!this.currentUser) return;

    try {
      this._notificationUsersService.addCurrentUserStatus(this.currentUser);
    } catch (error) {
      console.error('Error adding user status:', error);
      this.error.set('Failed to update user status');
    }
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  goToProfile(_id: string) {
    this._router.navigate(['/profile/', _id]);
  }
}
