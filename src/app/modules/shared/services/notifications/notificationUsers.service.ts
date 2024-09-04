import { Injectable, OnDestroy } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { BehaviorSubject, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { Token } from '@shared/interfaces/token.interface';

@Injectable({
  providedIn: 'root',
})
export class NotificationUsersService implements OnDestroy {
  private _userStatuses = new BehaviorSubject<Token[]>([]);
  public userStatuses$ = this._userStatuses.asObservable();

  private _unsubscribeAll = new Subject<void>();

  private inactivityDuration = 5 * 60 * 1000; // 5 minutes
  private inactivityTimeout: any;

  constructor(private socket: Socket) {
    this.initializeUserStatuses();
    this.subscribeToUserStatus();
    this.setupInactivityListeners();
  }

  private initializeUserStatuses() {
    this.socket.emit('getUserStatuses');
    this.socket
      .fromEvent<Token[]>('initialUserStatuses')
      .pipe(
        takeUntil(this._unsubscribeAll),
        catchError((error) => {
          console.error('Error receiving initial user statuses:', error);
          throw error;
        })
      )
      .subscribe((initialStatuses: Token[]) => {
        this._userStatuses.next(initialStatuses);
      });
  }

  private subscribeToUserStatus() {
    this.socket
      .fromEvent<Token>('userStatus')
      .pipe(
        takeUntil(this._unsubscribeAll),
        catchError((error) => {
          console.error('Error receiving user status:', error);
          throw error;
        })
      )
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
      if (data.status === 'offline') {
        currentStatuses.splice(userIndex, 1);
      } else {
        currentStatuses[userIndex] = data;
      }
    } else {
      if (data.status !== 'offline') {
        currentStatuses.push(data);
      }
    }
    this._userStatuses.next(currentStatuses);
  }

  private setupInactivityListeners() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.setUserInactive();
      } else {
        this.setUserActive();
      }
    });

    this.resetInactivityTimer();
    ['mousemove', 'keydown', 'scroll', 'click'].forEach((event) => {
      window.addEventListener(event, () => this.resetInactivityTimer());
    });
  }

  private resetInactivityTimer() {
    clearTimeout(this.inactivityTimeout);
    this.inactivityTimeout = setTimeout(() => {
      this.setUserInactive();
    }, this.inactivityDuration);
  }

  private setUserInactive() {
    this.socket.emit('userInactive');
  }

  private setUserActive() {
    this.socket.emit('userActive');
    this.resetInactivityTimer();
  }

  addCurrentUserStatus(userStatus: Token) {
    const currentStatuses = this._userStatuses.getValue();
    const userIndex = currentStatuses.findIndex(
      (status) => status._id === userStatus._id
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
    this.socket.emit('logoutUser');
  }

  loginUser() {
    this.socket.emit('loginUser');
  }

  ngOnDestroy() {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
    clearTimeout(this.inactivityTimeout);
  }
}
