import { Injectable, OnDestroy } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { shareReplay, distinctUntilChanged, debounceTime } from 'rxjs/operators';
import { BehaviorSubject, Subject } from 'rxjs';

import { AuthService } from '@auth/services/auth.service';
import { Token } from '@shared/interfaces/token.interface';
import { CacheService } from '../cache.service';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';

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

  private _inactivityDuration = 5 * 60 * 1000;

  private _inactivityTimeout: any;

  private _isInactive = false;

  private _userStatusMap = new Map<string, Token>();

  private readonly _CACHE_KEY = 'online_users';

  private _userLoggedOut = false;

  private _focusCheckInterval: any;

  private _lastFocusState = true;

  private _reconnectAttempts = 0;

  private _maxReconnectAttempts = 5;

  private _reconnectInterval: any;

  private _connectionCheckInterval: any;

  private _lastConnectionCheck = Date.now();

  private _connectionTimeout = 30000;

  private readonly _CACHE_DURATION = 30000;

  constructor(
    private _socket: Socket,
    private _authService: AuthService,
    private _cacheService: CacheService,
    private _logService: LogService
  ) {
    this.setupSocketConnectionHandlers();
    
    this._decodeToken = this._authService.getDecodedToken()!;

    this.initializeUserStatus();
    this.setupInactivityListeners();
    
    this.startConnectionMonitoring();
  }

  private setupSocketConnectionHandlers() {
    this._socket.on('connect', () => {
      this._reconnectAttempts = 0;
      this._lastConnectionCheck = Date.now();
      
      if (this._reconnectAttempts > 0) {
        this.initializeUserStatus();
        this.setupInactivityListeners();
      }
    });
    
    this._socket.on('disconnect', (reason: string) => {
      this._lastConnectionCheck = Date.now();
      
      this.scheduleReconnection();
    });
    
    this._socket.on('connect_error', (error: any) => {
      this._lastConnectionCheck = Date.now();
      
      this.scheduleReconnection();
    });
    
    this._socket.on('reconnect', (attemptNumber: number) => {
      this._reconnectAttempts = 0;
      this._lastConnectionCheck = Date.now();
      
      this.initializeUserStatus();
      this.setupInactivityListeners();
    });
    
    this._socket.on('reconnect_attempt', (attemptNumber: number) => {
      this._reconnectAttempts = attemptNumber;
    });
    
    this._socket.on('reconnect_failed', () => {
      this._logService.log(
        LevelLogEnum.ERROR,
        'NotificationUsersService',
        'Socket reconnection failed after multiple attempts',
        { maxAttempts: this._maxReconnectAttempts }
      );
    });
  }

  private startConnectionMonitoring() {
    this._connectionCheckInterval = setInterval(() => {
      this.checkConnectionHealth();
    }, 10000);
  }

  private checkConnectionHealth() {
    const now = Date.now();
    const timeSinceLastCheck = now - this._lastConnectionCheck;
    
    if (timeSinceLastCheck > this._connectionTimeout) {
      if (!this._socket.connected) {
        this.scheduleReconnection();
      } else {
        this._socket.emit('ping', Date.now());
      }
    }
    
    this._lastConnectionCheck = now;
  }

  private scheduleReconnection() {
    if (this._reconnectAttempts >= this._maxReconnectAttempts) {
      return;
    }
    
    if (this._reconnectInterval) {
      clearTimeout(this._reconnectInterval);
    }
    
    const delay = Math.min(1000 * Math.pow(2, this._reconnectAttempts), 30000);
    
    this._reconnectInterval = setTimeout(() => {
      if (!this._socket.connected) {
        this._socket.connect();
        this._reconnectAttempts++;
      }
    }, delay);
  }

  public forceReconnect() {
    if (this._socket.connected) {
      this._socket.disconnect();
    }
    
    this._reconnectAttempts = 0;
    this._socket.connect();
  }

  private initializeUserStatus() {
    const cachedStatuses = this._cacheService.getItem<Token[]>(this._CACHE_KEY);
    if (cachedStatuses && Array.isArray(cachedStatuses)) {
      this._userStatuses.next(cachedStatuses);
      this._userStatusMap = new Map(cachedStatuses.map(user => [user.id!, user]));
    }

    this._socket.emit('loginUser', localStorage.getItem('token'));

    this._socket.emit('getUserStatuses');

    this._socket.fromEvent<Token, 'userStatus'>('userStatus').subscribe((data: Token) => {
      this.updateUserStatus(data);
    });

    this._socket.fromEvent<Token, 'userUpdated'>('userUpdated').subscribe((data: Token) => {
      this.updateUserStatus(data);
    });

    this._socket.fromEvent<any, 'logoutUser'>('logoutUser').subscribe((data: any) => {
    });

    this._socket.fromEvent<Token[], 'initialUserStatuses'>('initialUserStatuses').subscribe((data: Token[]) => {
      this._userStatusMap.clear();
      
      data.forEach(user => {
        if (user.id) {
          this._userStatusMap.set(user.id, user);
        }
      });
      
      const updatedStatuses = Array.from(this._userStatusMap.values());
      this._userStatuses.next(updatedStatuses);
      this._cacheService.setItem<Token[]>(this._CACHE_KEY, updatedStatuses, this._CACHE_DURATION);
    });

    this._socket.fromEvent<Token[], 'refreshUserStatuses'>('refreshUserStatuses').subscribe((data: Token[]) => {
      this._userStatusMap.clear();
      
      data.forEach(user => {
        if (user.id) {
          this._userStatusMap.set(user.id, user);
        }
      });
      
      const updatedStatuses = Array.from(this._userStatusMap.values());
      this._userStatuses.next(updatedStatuses);
      this._cacheService.setItem<Token[]>(this._CACHE_KEY, updatedStatuses, this._CACHE_DURATION);
    });

    this._socket.fromEvent<any, 'userDisconnected'>('userDisconnected').subscribe((data: any) => {
      this._socket.emit('getUserStatuses');
    });

    // Add current user to list if not already present
    if (this._decodeToken && this._decodeToken.id) {
      const currentUserExists = this._userStatusMap.has(this._decodeToken.id);
      if (!currentUserExists) {
        const currentUser: Token = {
          id: this._decodeToken.id,
          email: this._decodeToken.email || '',
          username: this._decodeToken.username || '',
          name: this._decodeToken.name || 'Usuario',
          role: this._decodeToken.role || '',
          avatar: this._decodeToken.avatar || '',
          isTooltipActive: false,
          status: 'online'
        };
        this._userStatusMap.set(currentUser.id, currentUser);
        
        const updatedStatuses = Array.from(this._userStatusMap.values());
        this._userStatuses.next(updatedStatuses);
      }
    }
  }

  private updateUserStatus(data: Token) {
    if (!data) {
      if (this._decodeToken?.id && this._userStatusMap.has(this._decodeToken.id)) {
        this._userStatusMap.delete(this._decodeToken.id);
        this._userLoggedOut = true;
      }
      
      const updatedStatuses = Array.from(this._userStatusMap.values());
      this._userStatuses.next(updatedStatuses);
      
      setTimeout(() => {
        this.forceRefreshUserList();
      }, 1000);
      
      return;
    }
    
    if (data.id === this._decodeToken?.id && this._userLoggedOut) {
      return;
    }
    
    if (data.status === 'offLine' && data.id !== undefined) {
      if (this._userStatusMap.has(data.id)) {
        this._userStatusMap.delete(data.id);
      }
    } else {
      this._userStatusMap.set(data.id, data);
    }
    
    const updatedStatuses = Array.from(this._userStatusMap.values());
    this._userStatuses.next(updatedStatuses);
  }

  public setupInactivityListeners() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.setUserInactive();
      } else {
        this.setUserActive();
      }
    });

    window.addEventListener('blur', () => {
      this.setUserInactive();
    });

    window.addEventListener('focus', () => {
      this.setUserActive();
    });

    window.addEventListener('pagehide', () => {
      this.setUserInactive();
    });

    window.addEventListener('pageshow', () => {
      this.setUserActive();
    });

    const activityEvents = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart', 'touchmove'];
    activityEvents.forEach(event => {
      window.addEventListener(event, () => this.handleUserActivity(), { passive: true });
    });

    this.resetInactivityTimer();
  }

  private checkFocusState() {
    const currentFocusState = document.activeElement === document.body;
    
    if (currentFocusState !== this._lastFocusState) {
      if (currentFocusState) {
        this.setUserActive();
      } else {
        this.setUserInactive();
      }
      
      this._lastFocusState = currentFocusState;
    }
  }

  private handleVisibilityChange() {
    if (document.hidden) {
      this.setUserInactive();
    } else {
      this.setUserActive();
    }
  }

  private handleUserActivity() {
    this.setUserActive();
    this.resetInactivityTimer();
  }

  private resetInactivityTimer() {
    clearTimeout(this._inactivityTimeout);
    this._inactivityTimeout = setTimeout(() => {
      this.setUserInactive();
    }, this._inactivityDuration);
  }

  private setUserInactive() {
    if (!this._isInactive) {
      this._isInactive = true;
      this.emitUserInactive();
    }
  }

  private setUserActive() {
    if (this._isInactive) {
      this._isInactive = false;
      this.emitUserActive();
      this.resetInactivityTimer();
    } else {
      this.resetInactivityTimer();
    }
  }

  public userActive() {
    this._isInactive = false;
    this.emitUserActive();
    this.resetInactivityTimer();
  }

  public addCurrentUserStatus(userStatus: Token) {
    const currentStatuses = this._userStatuses.getValue();
    const userIndex = currentStatuses.findIndex(status => status?.id === userStatus?.id);

    if (userIndex === -1) {
      if (currentStatuses.includes(userStatus)) {
        currentStatuses.push(userStatus);
      }
      this._userStatuses.next(currentStatuses);
    }
  }

  private emitUserInactive() {
    if (!this._decodeToken?.id) {
      this._logService.log(
        LevelLogEnum.ERROR,
        'NotificationUsersService',
        'Cannot emit userInactive: User ID not available',
        { userId: this._decodeToken?.id }
      );
      return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
      this._logService.log(
        LevelLogEnum.ERROR,
        'NotificationUsersService',
        'No token available to emit userInactive',
        { userId: this._decodeToken.id }
      );
      return;
    }
    
    this._socket.emit('userInactive', token);
  }

  private emitUserActive() {
    if (!this._decodeToken?.id) {
      this._logService.log(
        LevelLogEnum.ERROR,
        'NotificationUsersService',
        'Cannot emit userActive: User ID not available',
        { userId: this._decodeToken?.id }
      );
      return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
      this._logService.log(
        LevelLogEnum.ERROR,
        'NotificationUsersService',
        'No token available to emit userActive',
        { userId: this._decodeToken.id }
      );
      return;
    }
    
    this._socket.emit('userActive', token);
  }

  public getUserStatuses() {
    return this._userStatuses.getValue();
  }

  public refreshUserStatuses() {
    if (!this._decodeToken?.id) {
      this._logService.log(
        LevelLogEnum.ERROR,
        'NotificationUsersService',
        'Cannot refresh status: User ID not available',
        { userId: this._decodeToken?.id }
      );
      return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
      this._logService.log(
        LevelLogEnum.ERROR,
        'NotificationUsersService',
        'No token available to refresh status',
        { userId: this._decodeToken.id }
      );
      return;
    }
    
    this._socket.emit('refreshUserStatuses', token);
  }

  public logoutUser() {
    if (!this._decodeToken?.id) {
      this._logService.log(
        LevelLogEnum.ERROR,
        'NotificationUsersService',
        'Cannot perform logout: User ID not available',
        { userId: this._decodeToken?.id }
      );
      return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
      this._logService.log(
        LevelLogEnum.ERROR,
        'NotificationUsersService',
        'No token available to perform logout',
        { userId: this._decodeToken.id }
      );
      return;
    }
    
    this._socket.emit('logoutUser', token);
    
  }

  public loginUser() {
    if (!this._decodeToken?.id) {
      this._logService.log(
        LevelLogEnum.ERROR,
        'NotificationUsersService',
        'Cannot perform login: User ID not available',
        { userId: this._decodeToken?.id }
      );
      return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
      this._logService.log(
        LevelLogEnum.ERROR,
        'NotificationUsersService',
        'No token available to perform login',
        { userId: this._decodeToken.id }
      );
      return;
    }
    
    this._userLoggedOut = false;
    
    this._socket.emit('loginUser', token);
  }

  public forceRefreshUserList() {
    if (this._socket.connected) {
      this._socket.emit('getUserStatuses');
    }
  }

  ngOnDestroy() {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
    
    clearTimeout(this._inactivityTimeout);
    clearInterval(this._focusCheckInterval);
    clearInterval(this._connectionCheckInterval);
    
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('blur', this.handleVisibilityChange);
    window.removeEventListener('focus', this.handleVisibilityChange);
    window.removeEventListener('pagehide', this.handleVisibilityChange);
    window.removeEventListener('pageshow', this.handleVisibilityChange);
    window.removeEventListener('beforeunload', this.handleVisibilityChange);
    window.removeEventListener('unload', this.handleVisibilityChange);
    ['mousemove', 'keydown', 'scroll', 'click', 'touchstart', 'touchmove'].forEach(event => {
      window.removeEventListener(event, this.handleUserActivity);
    });
    
    this._cacheService.removeItem(this._CACHE_KEY);
    
  }
}
