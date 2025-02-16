import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { UserService } from '@shared/services/core-apis/users.service';
import { User } from '@shared/interfaces/user.interface';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'worky-last-registered-users',
  templateUrl: './last-registered-users.component.html',
  styleUrls: ['./last-registered-users.component.css'],
})
export class LastRegisteredUsersComponent  implements OnInit, OnDestroy {

  private unsubscribe$ = new Subject<void>();

  constructor(
    private _userService: UserService,
    private _cdr: ChangeDetectorRef,
  ) { }

  users: User[] = [];

  ngOnInit() {
    this.getUsers();
  }
  private async getUsers() {
   await this._userService.searchUsers(5).pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: (data: User[]) => {
        const filterDate = new Date('2023-01-01');

        const filteredUsers = data.filter(user => {
          const registrationDate = new Date(user.createdAt);
          return registrationDate > filterDate;
        });

        const sortedUsers = filteredUsers.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        });

        this.users = sortedUsers;
        this._cdr.markForCheck();
      }
   });
  }



  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

}
