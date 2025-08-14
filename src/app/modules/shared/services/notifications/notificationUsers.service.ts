import { Injectable, OnDestroy } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { shareReplay, distinctUntilChanged, debounceTime } from 'rxjs/operators';
import { BehaviorSubject, Subject } from 'rxjs';

import { AuthService } from '@auth/services/auth.service';
import { Token } from '@shared/interfaces/token.interface';
import { CacheService } from '../cache.service';
import { SocketService } from '../socket.service';
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

  private inactivityDuration = 5 * 60 * 1000; // 5 minutes

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
    private _socketService: SocketService,
    private _logService: LogService
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
      this.userStatusMap = new Map(cachedStatuses.map(user => [user.id!, user]));
    }

    this.socket.emit('loginUser', localStorage.getItem('token'));

    this.socket.emit('getUserStatuses');

    this.socket.fromEvent<Token, 'userStatus'>('userStatus').subscribe((data: Token) => {
      this.updateUserStatus(data);
    });

    // Agregar listener para userUpdated (que emite el backend cuando cambia status)
    this.socket.fromEvent<Token, 'userUpdated'>('userUpdated').subscribe((data: Token) => {
      this.updateUserStatus(data);
    });

    this.socket.fromEvent<Token[], 'initialUserStatuses'>('initialUserStatuses').subscribe((data: Token[]) => {
      // Procesar usuarios iniciales
      data.forEach(user => {
        if (user.id) {
          this.userStatusMap.set(user.id, user);
        }
      });
      
      const updatedStatuses = Array.from(this.userStatusMap.values());
      this._userStatuses.next(updatedStatuses);
      this._cacheService.setItem<Token[]>(this.CACHE_KEY, updatedStatuses, this.CACHE_DURATION);
    });

    if (this._decodeToken) {
      this.addCurrentUserStatus(this._decodeToken);
    }
  }

  private updateUserStatus(data: Token) {
    
    if (data.status === 'offLine' && data.id !== undefined) {
      if (this.userStatusMap.has(data.id)) {
        this.userStatusMap.delete(data.id);
        this.sendBatchedUpdates();
      }
    } else {
      if (data.id !== undefined) {
        this.userStatusMap.set(data.id, data);
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
    activityEvents.forEach(event => window.addEventListener(event, this.handleUserActivity.bind(this), { passive: true }));

    this.resetInactivityTimer();
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
    clearTimeout(this.inactivityTimeout);
    this.inactivityTimeout = setTimeout(() => {
      this.setUserInactive();
    }, this.inactivityDuration);
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
    } else {
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
        'No se puede emitir userInactive: ID de usuario no disponible',
        { userId: this._decodeToken?.id }
      );
      return;
    }
    
    setTimeout(() => {
      const token = localStorage.getItem('token');
      if (!token) {
        this._logService.log(
          LevelLogEnum.ERROR,
          'NotificationUsersService',
          'No hay token disponible para emitir userInactive',
          { userId: this._decodeToken.id }
        );
        return;
      }
      
      this._socketService.updateToken(token);
      this._socketService.emitEvent('userInactive', token);
      
      // Emitir también directamente en el socket para asegurar que llegue
      this.socket.emit('userInactive', token);
    }, 3000);
  }

  private emitUserActive() {
    if (!this._decodeToken?.id) {
      this._logService.log(
        LevelLogEnum.ERROR,
        'NotificationUsersService',
        'No se puede emitir userActive: ID de usuario no disponible',
        { userId: this._decodeToken?.id }
      );
      return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
      this._logService.log(
        LevelLogEnum.ERROR,
        'NotificationUsersService',
        'No hay token disponible para emitir userActive',
        { userId: this._decodeToken.id }
      );
      return;
    }
    
    this._socketService.updateToken(token);
    this._socketService.emitEvent('userActive', token);
    
    // Emitir también directamente en el socket para asegurar que llegue
    this.socket.emit('userActive', token);
  }

  public getUserStatuses() {
    return this._userStatuses.getValue();
  }

  public refreshUserStatuses() {
    if (!this._decodeToken?.id) {
      this._logService.log(
        LevelLogEnum.ERROR,
        'NotificationUsersService',
        'No se puede refrescar status: ID de usuario no disponible',
        { userId: this._decodeToken?.id }
      );
      return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
      this._logService.log(
        LevelLogEnum.ERROR,
        'NotificationUsersService',
        'No hay token disponible para refrescar status',
        { userId: this._decodeToken.id }
      );
      return;
    }
    
    this._socketService.updateToken(token);
    this._socketService.emitEvent('refreshUserStatuses', token);
  }

  public logoutUser() {
    if (!this._decodeToken?.id) {
      this._logService.log(
        LevelLogEnum.ERROR,
        'NotificationUsersService',
        'No se puede hacer logout: ID de usuario no disponible',
        { userId: this._decodeToken?.id }
      );
      return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
      this._logService.log(
        LevelLogEnum.ERROR,
        'NotificationUsersService',
        'No hay token disponible para hacer logout',
        { userId: this._decodeToken.id }
      );
      return;
    }
    
    this._socketService.updateToken(token);
    this._socketService.emitEvent('logoutUser', token);
  }

  public loginUser() {
    if (!this._decodeToken?.id) {
      this._logService.log(
        LevelLogEnum.ERROR,
        'NotificationUsersService',
        'No se puede hacer login: ID de usuario no disponible',
        { userId: this._decodeToken?.id }
      );
      return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
      this._logService.log(
        LevelLogEnum.ERROR,
        'NotificationUsersService',
        'No hay token disponible para hacer login',
        { userId: this._decodeToken.id }
      );
      return;
    }
    
    this._socketService.updateToken(token);
    this._socketService.emitEvent('loginUser', token);
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
      window.removeEventListener(event, this.handleUserActivity);
    });
    
    // Clear cache
    this._cacheService.removeItem(this.CACHE_KEY);
    
    // Clear batched updates
    this.batchedUpdates = [];
  }
}
