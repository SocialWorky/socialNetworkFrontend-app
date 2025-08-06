import { Injectable, OnDestroy } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { shareReplay, distinctUntilChanged, debounceTime } from 'rxjs/operators';
import { BehaviorSubject, Subject } from 'rxjs';

import { AuthService } from '@auth/services/auth.service';
import { Token } from '@shared/interfaces/token.interface';
import { CacheService } from '../cache.service';
import { SocketService } from '../socket.service';

@Injectable({
  providedIn: 'root',
})
export class NotificationUsersService implements OnDestroy {

  private _decodeToken!: Token;

  private _userStatuses = new BehaviorSubject<Token[]>([]);

  public userStatuses$ = this._userStatuses.asObservable().pipe(
    distinctUntilChanged(),
    debounceTime(300),
    shareReplay(1)
  );

  private _unsubscribeAll = new Subject<void>();

  private inactivityDuration = 5 * 60 * 1000;

  private inactivityTimeout: any;

  private isInactive = false;

  private userStatusMap = new Map<string, Token>();

  private readonly CACHE_KEY = 'online_users';

  private batchedUpdates: Token[] = [];
  private batchInterval: any;

  constructor(
    private socket: Socket,
    private _authService: AuthService,
    private _cacheService: CacheService,
    private _socketService: SocketService
  ) {
    this._decodeToken = this._authService.getDecodedToken()!;

    this.initializeUserStatus();
    this.setupInactivityListeners();
  }

  private readonly CACHE_DURATION = 30000; // 30 seconds cache

  private initializeUserStatus() {
    // Check cache first
    const cachedStatuses = this._cacheService.getItem<Token[]>(this.CACHE_KEY);
    if (cachedStatuses && Array.isArray(cachedStatuses)) {
      this._userStatuses.next(cachedStatuses);
      this.userStatusMap = new Map(cachedStatuses.map(user => [user._id!, user]));
    }

    this.socket.emit('loginUser', localStorage.getItem('token'));

    this.socket.emit('getUserStatuses');

    this.socket.fromEvent<Token[], 'initialUserStatuses'>('initialUserStatuses').subscribe((initialStatuses: Token[]) => {
      this._userStatuses.next(initialStatuses);
      this._cacheService.setItem(this.CACHE_KEY, initialStatuses);
      this.userStatusMap = new Map(initialStatuses.map(user => [user._id!, user]));
    });

    this.socket.fromEvent<Token, 'userStatus'>('userStatus').subscribe((data: Token) => {
      this.updateUserStatus(data);
    });

    if (this._decodeToken) {
      this.addCurrentUserStatus(this._decodeToken);
    }
  }

  private updateUserStatus(data: Token) {
    if (data.status === 'offLine' && data._id !== undefined) {
      if (this.userStatusMap.has(data._id)) {
        this.userStatusMap.delete(data._id);
        this.sendBatchedUpdates();
      }
    } else {
      if (data._id !== undefined) {
        this.userStatusMap.set(data._id, data);
        this.addToBatch(data);
      }
    }

    const updatedStatuses = Array.from(this.userStatusMap.values());
    this._userStatuses.next(updatedStatuses);
    this._cacheService.setItem<Token[]>(this.CACHE_KEY, updatedStatuses, this.CACHE_DURATION);
  }

  private addToBatch(userStatus: Token) {
    this.batchedUpdates.push(userStatus);

    if (!this.batchInterval) {
      this.batchInterval = setTimeout(() => {
        this.sendBatchedUpdates();
      }, 3000);
    }
  }

  private sendBatchedUpdates() {
    if (this.batchedUpdates.length > 0) {
      this.socket.emit('userStatusesBatch', this.batchedUpdates);
      this.batchedUpdates = [];
    }
    clearTimeout(this.batchInterval);
    this.batchInterval = null;
  }

  public setupInactivityListeners() {
    document.addEventListener('visibilitychange', () => this.handleVisibilityChange());

    const activityEvents = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart', 'touchmove'];
    activityEvents.forEach(event => window.addEventListener(event, this.throttledHandleUserActivity.bind(this), { passive: true }));

    this.resetInactivityTimer();
  }

  private throttledHandleUserActivity: () => void = this.throttle(this.handleUserActivity.bind(this), 3000);

  private throttle(fn: () => void, limit: number) {
    let lastFn: any;
    let lastRan: number;

    return function (this: any, ...args: any) {
      if (!lastRan) {
        fn.apply(this, args);
        lastRan = Date.now();
      } else {
        clearTimeout(lastFn);
        lastFn = setTimeout(() => {
          if ((Date.now() - lastRan) >= limit) {
            fn.apply(this, args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    };
  }

  private handleVisibilityChange() {
    if (document.hidden) {
      this.setUserInactive();
    } else {
      this.setUserActive();
    }
  }

  private handleUserActivity() {
    if (!this.isInactive) {
      this.setUserActive();
      this.resetInactivityTimer();
    }
  }

  private resetInactivityTimer() {
    clearTimeout(this.inactivityTimeout);
    this.inactivityTimeout = setTimeout(() => this.setUserInactive(), this.inactivityDuration);
  }

  private setUserInactive() {
    if (!this.isInactive) {
      this.isInactive = true;
      this.emitUserInactive();
    }
  }

  private setUserActive() {
    if (this.isInactive) {
      this.isInactive = false;
      this.emitUserActive();
      this.resetInactivityTimer();
    }
  }

  public userActive() {
    this.isInactive = false;
    this.emitUserActive();
    this.resetInactivityTimer();
  }

  public addCurrentUserStatus(userStatus: Token) {
    const currentStatuses = this._userStatuses.getValue();
    const userIndex = currentStatuses.findIndex(status => status?._id === userStatus?._id);

    if (userIndex === -1) {
      if (currentStatuses.includes(userStatus)) {
        currentStatuses.push(userStatus);
      }
      this._userStatuses.next(currentStatuses);
    }
  }

  private emitUserInactive() {
    setTimeout(() => {
      if(!localStorage.getItem('token')) return;
      this._socketService.updateToken(localStorage.getItem('token')!);
      this._socketService.emitEvent('userInactive', localStorage.getItem('token'));
    }, 3000);
  }

  private emitUserActive() {
    setTimeout(() => {
      if(!localStorage.getItem('token')) return;
      this._socketService.updateToken(localStorage.getItem('token')!);
      this._socketService.emitEvent('userActive', localStorage.getItem('token'));
    }, 3000);
  }

  public getUserStatuses() {
    return this._userStatuses.getValue();
  }

  public refreshUserStatuses() {
    setTimeout(() => {
      if(!localStorage.getItem('token')) return;
      this._socketService.updateToken(localStorage.getItem('token')!);
      this._socketService.emitEvent('refreshUserStatuses', localStorage.getItem('token'));
    }, 3000);
  }

  public logoutUser() {
    if(!localStorage.getItem('token')) return;
    this._socketService.emitEvent('logoutUser', localStorage.getItem('token'));
  }

  public loginUser() {
    setTimeout(() => {
      if(!localStorage.getItem('token')) return;
      this._socketService.updateToken(localStorage.getItem('token')!);
      this._socketService.emitEvent('loginUser', localStorage.getItem('token'));
    }, 3000);
  }

  ngOnDestroy() {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
    
    // Clear all timeouts to prevent memory leaks
    clearTimeout(this.inactivityTimeout);
    clearTimeout(this.batchInterval);
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    ['mousemove', 'keydown', 'scroll', 'click', 'touchstart', 'touchmove'].forEach(event => {
      window.removeEventListener(event, this.throttledHandleUserActivity);
    });
    
    // Clear cache
    this._cacheService.removeItem(this.CACHE_KEY);
    
    // Clear batched updates
    this.batchedUpdates = [];
  }
}
