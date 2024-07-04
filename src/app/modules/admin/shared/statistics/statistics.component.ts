import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { User } from '@shared/interfaces/user.interface';
import { UserService } from '@shared/services/users.service';
import { PublicationService } from '@shared/services/publication.service';
import { ReportsService } from '@shared/services/reports.service';
import { ReportStatus } from '@shared/enums/report.enum';
import * as _ from 'lodash';

@Component({
  selector: 'worky-admin-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss'],
})
export class StatisticsComponent  implements OnInit {

  private subscription: Subscription = new Subscription();

  private _allUsers: User[] = [];

  private _countPublications: number = 0;

  private _reportsStatusPending = [];


  get allUsersLength() {
    return this._allUsers.length;
  }

  get countPublications() {
    return this._countPublications;
  }

  get ReportsStatusPendingCount() {
    return this._reportsStatusPending.length;
  }

  constructor (
    private _userService: UserService,
    private _publicationService: PublicationService,
    private _cdr: ChangeDetectorRef,
    private _reportsService: ReportsService
  ) { }

  ngOnInit() {
    this.getAllUsers();
    this.getCountPublications();
    this.getReportsStatusPending();
    this._cdr.markForCheck();
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

  private getReportsStatusPending() {
    this.subscription.add(this._reportsService.getReportsStatus(ReportStatus.PENDING).subscribe((data) => {
      this._reportsStatusPending = data;
      this._cdr.markForCheck();
    }));
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

}
