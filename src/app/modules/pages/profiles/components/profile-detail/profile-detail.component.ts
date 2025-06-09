import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';

import { EditInfoProfileDetailComponent } from '../edit-info-profile/edit-info-profile.component';
import { User } from '@shared/interfaces/user.interface';
import { WorkyButtonType, WorkyButtonTheme } from '@shared/modules/buttons/models/worky-button-model';
import { UserService } from '@shared/services/core-apis/users.service';
import { CustomFieldService } from '@shared/services/core-apis/custom-field.service';
import { CustomFieldDestination } from '@shared/modules/form-builder/interfaces/custom-field.interface';
import { isArray } from 'lodash';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';

@Component({
    selector: 'worky-profile-detail',
    templateUrl: './profile-detail.component.html',
    styleUrls: ['./profile-detail.component.scss'],
    standalone: false
})
export class ProfileDetailComponent  implements OnInit {

  WorkyButtonType = WorkyButtonType;

  WorkyButtonTheme = WorkyButtonTheme;

  dynamicFieldsDictionary = {} as { [key: string]: string };

  dynamicFields: any[] = [];

  pushData: any = [];

  private unsubscribe$ = new Subject<void>();

  @Input() isCurrentUser: boolean | undefined;

  @Input() userData: User | undefined;

  constructor(
    private _dialog: MatDialog,
    private _cdr: ChangeDetectorRef,
    private _userService: UserService,
    private _customFieldService: CustomFieldService,
    private _logService: LogService,
  ) { }

  ngOnInit() {
    this.getDynamicFields();
  }

  private getDynamicFields(): void {
    this._customFieldService.getCustomFields().pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: (response: any[]) => {
        response.forEach((field: any) => {
          if (field.destination === CustomFieldDestination.PROFILE) {
            this.dynamicFieldsDictionary[field.id] = field.label;
          }
        });
        this.processDynamicFields();
        this._cdr.markForCheck();
      },
      error: (error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'ProfileDetailComponent',
          'Error getting custom fields',
          {
            user: this.userData,
            message: error,
          },
        );
      }
    })
  }

  private getDynamicLabel(fieldId: string): string {
    return (this.dynamicFieldsDictionary[fieldId]);
  }

  private processDynamicFields(): void {
    if (this.userData?.profile.dynamicFields) {
      this.pushData = [];
      this.dynamicFields = Object.keys(this.userData?.profile.dynamicFields).map((key: string) => {
        const data = this.userData?.profile.dynamicFields[key];

        // TODO: remove this when backend fix the issue with empty array
        if (data.length) this.pushData.push(data);
        return {
          type: isArray(this.userData?.profile.dynamicFields[key]) ? 'array' : 'string',
          label: this.getDynamicLabel(key),
          value: this.userData?.profile.dynamicFields[key]
        };
      });
    }
  }

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
            this.processDynamicFields();
            this._cdr.markForCheck();
          },
          error: (error) => {
            this._logService.log(
              LevelLogEnum.ERROR,
              'ProfileDetailComponent',
              'Error getting user data',
              {
                user: this.userData,
                message: error,
              },
            );
          },
        });
      };
    });
  }

}
