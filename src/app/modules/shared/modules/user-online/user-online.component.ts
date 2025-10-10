import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Token } from '@shared/interfaces/token.interface';
import { Subject, interval, BehaviorSubject } from 'rxjs';
import { takeUntil, catchError, startWith, distinctUntilChanged, debounceTime, filter } from 'rxjs/operators';

import { NotificationUsersService } from '@shared/services/notifications/notificationUsers.service';
import { AuthService } from '@auth/services/auth.service';
import { GlobalEventService } from '@shared/services/globalEventService.service';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';

@Component({
    selector: 'worky-user-online',
    templateUrl: './user-online.component.html',
    styleUrls: ['./user-online.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class UserOnlineComponent implements OnInit, OnDestroy {
  private readonly _destroy$ = new Subject<void>();

  private readonly REFRESH_INTERVAL = 30000;
  private readonly LOADING_TIMEOUT = 10000; // 10 seconds timeout for loading

  usersOnline = signal<Token[]>([]);

  isLoading = signal<boolean>(false);

  currentUser: Token | null = null;

  filteredUsers = computed(() => {
    const users = this.usersOnline();
    
    const filtered = users.filter(user => user.status !== 'offLine');
    
    return filtered;
  });

  onlineCount = computed(() => {
    return this.filteredUsers().length;
  });

  private _updateTrigger$ = new BehaviorSubject<void>(undefined);
  private _loadingTimeout: any = null;

  constructor(
    private _cdr: ChangeDetectorRef,
    private _notificationUsersService: NotificationUsersService,
    private _router: Router,
    private _authService: AuthService,
    private _globalEventService: GlobalEventService,
    private _logService: LogService,
  ) {
    this.checkAndInitializeUser();
  }

  private checkAndInitializeUser(): void {
    try {
      const decodedToken = this._authService.getDecodedToken();
      if (decodedToken && typeof decodedToken === 'object' && 'id' in decodedToken) {
        this.currentUser = decodedToken as Token;
      } else {
        throw new Error('Invalid token format');
      }
    } catch (error) {
      this._logService.log(
        LevelLogEnum.ERROR,
        'UserOnlineComponent',
        'Error initializing user',
        { error: error instanceof Error ? error.message : String(error) }
      );
      this._authService.logout();
      this._router.navigate(['/login']);
    }
  }

  private setLoadingWithTimeout(): void {
    this.isLoading.set(true);
    
    // Clear existing timeout
    if (this._loadingTimeout) {
      clearTimeout(this._loadingTimeout);
    }
    
    // Set timeout to ensure loading doesn't stay forever
    this._loadingTimeout = setTimeout(() => {
      this.isLoading.set(false);
      this._cdr.markForCheck();
    }, this.LOADING_TIMEOUT);
  }

  private clearLoadingTimeout(): void {
    if (this._loadingTimeout) {
      clearTimeout(this._loadingTimeout);
      this._loadingTimeout = null;
    }
  }

  ngOnInit() {
    if (!this.currentUser) return;

    this.setLoadingWithTimeout();
    
    // Activar detección de inactividad
    this._notificationUsersService.setupInactivityListeners();
    
    this._globalEventService.profileImage$
      .pipe(
        takeUntil(this._destroy$),
        filter(newImageUrl => !!newImageUrl && !!this.currentUser)
      )
      .subscribe(newImageUrl => {
        this.updateCurrentUserAvatar(newImageUrl!);
      });
    
    this._notificationUsersService.userStatuses$
      .pipe(
        takeUntil(this._destroy$),
        distinctUntilChanged((prev: Token[], curr: Token[]) => {
          if (prev.length !== curr.length) return false;
          return prev.every((user, index) => user.id === curr[index]?.id && user.status === curr[index]?.status);
        }),
        debounceTime(500),
        catchError((error) => {
          this._logService.log(
            LevelLogEnum.ERROR,
            'UserOnlineComponent',
            'Error fetching user statuses',
            { error: error instanceof Error ? error.message : String(error) }
          );
          // Ensure loading is cleared on error
          this.clearLoadingTimeout();
          this.isLoading.set(false);
          this._cdr.markForCheck();
          return [];
        })
      )
      .subscribe((userStatuses: Token[]) => {
        this.updateUsersList(userStatuses);
      });

    interval(this.REFRESH_INTERVAL)
      .pipe(
        takeUntil(this._destroy$),
        startWith(0)
      )
      .subscribe(() => {
        this._updateTrigger$.next();
      });

    this.initializeCurrentUserStatus();
  }

  private updateCurrentUserAvatar(newImageUrl: string): void {
    if (!this.currentUser) return;

    const updatedUsers = this.usersOnline().map(user => {
      if (user.id === this.currentUser?.id) {
        return { ...user, avatar: newImageUrl };
      }
      return user;
    });

    this.usersOnline.set(updatedUsers);
    this._cdr.markForCheck();
  }

  private updateUsersList(userStatuses: Token[]): void {
    try {
      const currentUsers = this.usersOnline();
      
      const hasChanges = this.hasSignificantChanges(currentUsers, userStatuses);

      if (hasChanges) {
        let updatedUserStatuses = [...userStatuses];
        
        if (this.currentUser) {
          const currentUserExists = updatedUserStatuses.some(user => user.id === this.currentUser?.id);
          
          if (!currentUserExists) {
            const currentUserWithStatus = {
              ...this.currentUser,
              status: 'online' as const
            };
            updatedUserStatuses.unshift(currentUserWithStatus);
          }
        }
        
        this.usersOnline.set(updatedUserStatuses);
        this.clearLoadingTimeout();
        this.isLoading.set(false);
        this._cdr.markForCheck();
      } else {
        // Even if no changes, clear loading after first data received
        if (this.isLoading()) {
          this.clearLoadingTimeout();
          this.isLoading.set(false);
          this._cdr.markForCheck();
        }
      }
    } catch (error) {
      this._logService.log(
        LevelLogEnum.ERROR,
        'UserOnlineComponent',
        'Error updating users list',
        { error: error instanceof Error ? error.message : String(error) }
      );
      this.clearLoadingTimeout();
      this.isLoading.set(false);
      this._cdr.markForCheck();
    }
  }

  private hasSignificantChanges(current: Token[], incoming: Token[]): boolean {
    
    if (current.length !== incoming.length) {
      return true;
    }

    const hasChanges = incoming.some((user, index) => {
      const currentUser = current[index];
      const changed = !currentUser || 
             currentUser.status !== user.status ||
             currentUser.id !== user.id;
      
      return changed;
    });

    return hasChanges;
  }

  private initializeCurrentUserStatus(): void {
    if (!this.currentUser) return;

    try {
      const currentUserWithStatus = {
        ...this.currentUser,
        status: 'online' as const
      };
      
      this.usersOnline.set([currentUserWithStatus]);
      
      this._notificationUsersService.addCurrentUserStatus(this.currentUser);
      
      // Clear loading after initializing user status
      this.clearLoadingTimeout();
      this.isLoading.set(false);
      this._cdr.markForCheck();
    } catch (error) {
      this._logService.log(
        LevelLogEnum.ERROR,
        'UserOnlineComponent',
        'Error adding user status',
        { error: error instanceof Error ? error.message : String(error) }
      );
      this.clearLoadingTimeout();
      this.isLoading.set(false);
      this._cdr.markForCheck();
    }
  }

  ngOnDestroy(): void {
    this.clearLoadingTimeout();
    this._destroy$.next();
    this._destroy$.complete();
  }

  goToProfile(userId: string): void {
    if (!userId) return;
    this._router.navigate(['/profile/', userId]);
  }

  // Método para testing - forzar inactividad del usuario actual
  forceUserInactive(): void {
    // Simular cambio de pestaña para activar inactividad
    Object.defineProperty(document, 'hidden', {
      writable: true,
      value: true
    });
    document.dispatchEvent(new Event('visibilitychange'));
  }

  // Método para testing - forzar actividad del usuario actual
  forceUserActive(): void {
    this._notificationUsersService.userActive();
  }
}
