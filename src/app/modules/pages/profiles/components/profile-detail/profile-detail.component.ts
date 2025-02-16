import { ChangeDetectorRef, Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';

import { EditInfoProfileDetailComponent } from '../edit-info-profile/edit-info-profile.component';
import { User } from '@shared/interfaces/user.interface';
import { WorkyButtonType, WorkyButtonTheme } from '@shared/modules/buttons/models/worky-button-model';
import { UserService } from '@shared/services/core-apis/users.service';

@Component({
  selector: 'worky-profile-detail',
  templateUrl: './profile-detail.component.html',
  styleUrls: ['./profile-detail.component.scss'],
})
export class ProfileDetailComponent  implements OnInit {

  WorkyButtonType = WorkyButtonType;

  WorkyButtonTheme = WorkyButtonTheme;

  private unsubscribe$ = new Subject<void>();

  @Input() isCurrentUser: boolean | undefined;

  @Input() userData: User | undefined;

  constructor(
    private _dialog: MatDialog,
    private _cdr: ChangeDetectorRef,
    private _userService: UserService,
  ) { }

  ngOnInit() {}

  openEditProfileDetailModal() {
    const dialogRef = this._dialog.open(EditInfoProfileDetailComponent, {
      data: {
        userData: this.userData,
      }
    });

    dialogRef.afterClosed().pipe(takeUntil(this.unsubscribe$)).subscribe(async result => {
      if (result) {
        await this._userService.getUserById(this.userData?._id!).pipe(takeUntil(this.unsubscribe$)).subscribe({
          next: (response: User) => {
            this.userData = response;
            this._cdr.markForCheck();
          },
          error: (error) => {
            console.error(error);
          },
        });
      };
    });
  }

}
