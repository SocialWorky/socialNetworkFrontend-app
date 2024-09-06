import { Injectable, OnDestroy } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { BehaviorSubject, Subject } from 'rxjs';
import { AuthService } from '@auth/services/auth.service';
import { Token } from '@shared/interfaces/token.interface';

@Injectable({
  providedIn: 'root',
})
export class NotificationUsersService implements OnDestroy {
  token: Token;

  private _userStatuses = new BehaviorSubject<Token[]>([]);
  public userStatuses$ = this._userStatuses.asObservable();

  private _unsubscribeAll = new Subject<void>();

  private inactivityDuration = 4 * 60 * 1000; // 4 minutes
  private inactivityTimeout: any;
  private isInactive = false;

  constructor(private socket: Socket, private _authService: AuthService) {
    this.token = this._authService.getDecodedToken()!;
    this.updateUserStatus(this.token);
    this.addCurrentUserStatus(this.token);

    this.socket.emit('loginUser', this.token);

    this.subscribeToUserStatus();
    this.initializeUserStatuses();
    this.setupInactivityListeners();
  }

  private initializeUserStatuses() {
    this.socket.emit('getUserStatuses');
    this.socket
      .fromEvent<Token[]>('initialUserStatuses')
      .subscribe((initialStatuses: Token[]) => {
        this._userStatuses.next(initialStatuses);
      });
  }

  private subscribeToUserStatus() {
    this.socket
      .fromEvent<Token>('userStatus')
      .subscribe((data: Token) => {
        this.updateUserStatus(data);
      });
  }

  private updateUserStatus(data: Token) {
    const currentStatuses = this._userStatuses.getValue();
    const userIndex = currentStatuses.findIndex(
      (status) => status._id === data._id
    );
    if (userIndex !== -1) {
      if (data?.status === 'offLine') {
        currentStatuses.splice(userIndex, 1);
      } else {
        currentStatuses[userIndex] = data;
      }
    } else {
      if (data?.status !== 'offLine') {
        currentStatuses.push(data);
      }
    }
    this._userStatuses.next(currentStatuses);
  }

  setupInactivityListeners() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.isInactive = true;
        this.setUserInactive();
      } else {
        this.isInactive = false;
        this.setUserActive();
      }
    });

    ['mousemove', 'keydown', 'scroll', 'click'].forEach((event) => {
      window.addEventListener(event, () => this.handleUserActivity());
    });

    this.resetInactivityTimer();
  }

  private handleUserActivity() {
    if (!this.isInactive) {
      this.setUserActive(); 
      this.socket.emit('userActive', this.token);
      this.resetInactivityTimer();
    }
    this.isInactive = false;
  }

  private resetInactivityTimer() {
    clearTimeout(this.inactivityTimeout);
    this.inactivityTimeout = setTimeout(() => {
      this.setUserInactive();
    }, this.inactivityDuration);
  }

  private setUserInactive() {
    if (this.isInactive) {
      this.socket.emit('userInactive', this.token);
    }
  }

  private setUserActive() {
    if (!this.isInactive) {
      this.socket.emit('userActive', this.token);
      this.resetInactivityTimer();
    }
  }

  addCurrentUserStatus(userStatus: Token) {
    const currentStatuses = this._userStatuses.getValue();
    const userIndex = currentStatuses?.findIndex(
      (status) => status?._id === userStatus?._id
    );
    if (userIndex === -1) {
      currentStatuses.push(userStatus);
      this._userStatuses.next(currentStatuses);
    }
  }

  getUserStatuses() {
    return this._userStatuses.getValue();
  }

  refreshUserStatuses() {
    this.socket.emit('refreshUserStatuses');
  }

  logoutUser() {
    this.socket.emit('logoutUser', this.token);
  }

  loginUser() {
    this.socket.emit('loginUser', this.token);
  }

  ngOnDestroy() {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
    clearTimeout(this.inactivityTimeout);
    document.removeEventListener('visibilitychange', this.handleUserActivity);
    ['mousemove', 'keydown', 'scroll', 'click'].forEach((event) => {
      window.removeEventListener(event, this.handleUserActivity);
    });
  }
}
