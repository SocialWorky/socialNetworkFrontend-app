import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { UserService } from '@shared/services/users.service';
import { User } from '@shared/interfaces/user.interface';
import { Subscription } from 'rxjs';

@Component({
  selector: 'worky-last-registered-users',
  templateUrl: './last-registered-users.component.html',
  styleUrls: ['./last-registered-users.component.scss'],
})
export class LastRegisteredUsersComponent  implements OnInit, OnDestroy {

  private subscription: Subscription = new Subscription();

  constructor(
    private _userService: UserService,
    private _cdr: ChangeDetectorRef,
  ) { }

  users: User[] = [];

  ngOnInit() {
    this.getUsers();
  }

  private getUsers() {
    this.subscription.add(this._userService.searchUsers(5).subscribe((data) => {
      this.users = data;
      this._cdr.markForCheck();
    }));
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

}
