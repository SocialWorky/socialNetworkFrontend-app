import { Injectable, OnDestroy } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { BehaviorSubject, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class NotificationUsersService implements OnDestroy {
  private _userStatuses = new BehaviorSubject<any[]>([]);
  public userStatuses$ = this._userStatuses.asObservable();

  private _unsubscribeAll = new Subject<void>();

  constructor(private socket: Socket) {
    this.initializeUserStatuses();
    this.subscribeToUserStatus();
  }

  private initializeUserStatuses() {
    this.socket.emit('getUserStatuses');
    this.socket.fromEvent<any[]>('initialUserStatuses')
      .pipe(
        takeUntil(this._unsubscribeAll),
        catchError(error => {
          console.error('Error receiving initial user statuses:', error);
          throw error;
        })
      )
      .subscribe((initialStatuses: any[]) => {
        this._userStatuses.next(initialStatuses);
      });
  }

  private subscribeToUserStatus() {
    this.socket.fromEvent<any>('userStatus')
      .pipe(
        takeUntil(this._unsubscribeAll),
        catchError(error => {
          console.error('Error receiving user status:', error);
          throw error;
        })
      )
      .subscribe((data: any) => {
        this.updateUserStatus(data);
      });
  }

  private updateUserStatus(data: any) {
    const currentStatuses = this._userStatuses.getValue();
    const userIndex = currentStatuses.findIndex(status => status._id === data._id);
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

  addCurrentUserStatus(userStatus: any) {
    const currentStatuses = this._userStatuses.getValue();
    const userIndex = currentStatuses.findIndex(status => status._id === userStatus._id);
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
  }
}
