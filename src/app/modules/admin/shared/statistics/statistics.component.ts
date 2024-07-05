import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
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

  private unsubscribe$ = new Subject<void>();

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
    private _publicationService: PublicationService,
    private _userService: UserService,
    private _cdr: ChangeDetectorRef,
    private _reportsService: ReportsService
  ) { }

  async ngOnInit() {
    await this.getCountPublications();
    await this.getReportsStatusPending();
    await this.getAllUsers();
    this._cdr.markForCheck();
  }

  private async getAllUsers() {
    await this._userService.getAllUsers().pipe(takeUntil(this.unsubscribe$)).subscribe((data: User[]) => {
      this._allUsers = data;
      this._cdr.markForCheck();      
    });
  }

  private async getCountPublications() {
    await this._publicationService.getCountPublications().pipe(takeUntil(this.unsubscribe$)).subscribe((data) => {
      this._countPublications = data;
      this._cdr.markForCheck();
    });
  }

  private async getReportsStatusPending() {
    await this._reportsService.getReportsStatus(ReportStatus.PENDING).pipe(takeUntil(this.unsubscribe$)).subscribe((data) => {
      this._reportsStatusPending = data;
      this._cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

}
