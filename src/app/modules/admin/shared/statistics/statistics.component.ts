import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { User } from '@shared/interfaces/user.interface';
import { UserService } from '@shared/services/users.service';
import { PublicationService } from '@shared/services/publication.service';

@Component({
  selector: 'worky-admin-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss'],
})
export class StatisticsComponent  implements OnInit {

  private subscription: Subscription = new Subscription();

  private _allUsers: User[] = [];

  private _countPublications: number = 0;

  get allUsersLength() {
    return this._allUsers.length;
  }

  get countPublications() {
    return this._countPublications;
  }

  constructor (
    private _userService: UserService,
    private _publicationService: PublicationService,
    private _cdr: ChangeDetectorRef,
  ) { }

  ngOnInit() {
    this.getAllUsers();
    this.getCountPublications();
  }

  private getAllUsers() {
    this.subscription.add(this._userService.getAllUsers().subscribe((data) => {
      this._allUsers = data;
      this._cdr.markForCheck();      
    }));
  }

  private getCountPublications() {
    this.subscription.add(this._publicationService.getCountPublications().subscribe((data) => {
      this._countPublications = data;
      this._cdr.markForCheck();
    }));
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

}
