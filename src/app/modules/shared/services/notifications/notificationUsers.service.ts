import { Injectable, OnDestroy } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { BehaviorSubject, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class NotificationUsersService implements OnDestroy {
  private _userStatuses = new BehaviorSubject<any>([] || null);

  public userStatuses$ = this._userStatuses.asObservable();

  private _unsubscribeAll = new Subject<void>();

  constructor(private socket: Socket) {
    this.subscribeToUserStatus();
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
        const currentStatuses = this._userStatuses.getValue();
        const updatedStatuses = currentStatuses.filter((status: { userId: any; }) => status.userId !== data.userId);
        updatedStatuses.push(data);
        this._userStatuses.next(updatedStatuses);
      });
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
