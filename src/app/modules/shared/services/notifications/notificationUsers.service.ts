import { Injectable, OnDestroy } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { BehaviorSubject, Subject } from 'rxjs';
import { AuthService } from '@auth/services/auth.service';
import { Token } from '@shared/interfaces/token.interface';

@Injectable({
  providedIn: 'root',
})
export class NotificationUsersService implements OnDestroy {
  private token: Token;
  private _userStatuses = new BehaviorSubject<Token[]>([]);
  public userStatuses$ = this._userStatuses.asObservable();
  private _unsubscribeAll = new Subject<void>();
  private inactivityDuration = 5 * 60 * 1000; // 5 minutes
  private inactivityTimeout: any;
  private isInactive = false;

  constructor(private socket: Socket, private _authService: AuthService) {
    this.token = this._authService.getDecodedToken()!;
    this.initializeUserStatus();
    this.setupInactivityListeners();
  }

  private initializeUserStatus() {
    this.socket.emit('loginUser', this.token);
    this.socket.emit('getUserStatuses');
    
    this.socket.fromEvent<Token[]>('initialUserStatuses').subscribe((initialStatuses: Token[]) => {
      this._userStatuses.next(initialStatuses);
    });

    this.socket.fromEvent<Token>('userStatus').subscribe((data: Token) => {
      this.updateUserStatus(data);
    });
    
    this.addCurrentUserStatus(this.token);
  }

  private updateUserStatus(data: Token) {
    const currentStatuses = this._userStatuses.getValue();
    const userIndex = currentStatuses.findIndex(status => status._id === data._id);

    if (data?.status === 'offLine') {
      if (userIndex !== -1) {
        currentStatuses.splice(userIndex, 1); // Remove offline user
      }
    } else {
      if (userIndex === -1) {
        currentStatuses.push(data); // Add new user status
      } else {
        currentStatuses[userIndex] = data; // Update existing status
      }
    }

    this._userStatuses.next(currentStatuses);
  }

  public setupInactivityListeners() {
    document.addEventListener('visibilitychange', () => this.handleVisibilityChange());

    const activityEvents = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart', 'touchmove'];
    activityEvents.forEach(event => window.addEventListener(event, () => this.handleUserActivity(), { passive: true }));

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
      this.socket.emit('userInactive', this.token);
    }
  }

  private setUserActive() {
    if (this.isInactive) {
      this.isInactive = false;
      this.socket.emit('userActive', this.token);
      this.resetInactivityTimer();
    }
  }

  public addCurrentUserStatus(userStatus: Token) {
    const currentStatuses = this._userStatuses.getValue();
    const userIndex = currentStatuses.findIndex(status => status?._id === userStatus?._id);
    
    if (userIndex === -1) {
      currentStatuses.push(userStatus);
      this._userStatuses.next(currentStatuses);
    }
  }

  public getUserStatuses() {
    return this._userStatuses.getValue();
  }

  public refreshUserStatuses() {
    this.socket.emit('refreshUserStatuses');
  }

  public logoutUser() {
    this.socket.emit('logoutUser', this.token);
  }

  public loginUser() {
    this.socket.emit('loginUser', this.token);
  }

  ngOnDestroy() {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
    clearTimeout(this.inactivityTimeout);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    ['mousemove', 'keydown', 'scroll', 'click', 'touchstart', 'touchmove'].forEach(event => {
      window.removeEventListener(event, this.handleUserActivity);
    });
  }
}
