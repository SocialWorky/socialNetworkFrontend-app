import { ChangeDetectorRef, Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { isArray } from 'lodash';

import { EditInfoProfileDetailComponent } from '../edit-info-profile/edit-info-profile.component';
import { User } from '@shared/interfaces/user.interface';
import { WorkyButtonType, WorkyButtonTheme } from '@shared/modules/buttons/models/worky-button-model';
import { UserService } from '@shared/services/core-apis/users.service';
import { CustomFieldService } from '@shared/services/core-apis/custom-field.service';
import { CustomFieldType } from '@shared/modules/form-builder/interfaces/custom-field.interface';
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

  dynamicFieldsDictionary = {} as {
    [key: string]: { label: string; type: string; showInProfileDetail: boolean };
  };

  dynamicFields: any[] = [];

  private unsubscribe$ = new Subject<void>();

  @Input() isCurrentUser: boolean | undefined;

  @Input() userData: User | undefined;

  @Output() userDataUpdated = new EventEmitter<User>();

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
        // Index every field definition (any destination) so values captured at
        // registration or in the profile both resolve their label and type.
        response.forEach((field: any) => {
          this.dynamicFieldsDictionary[field.id] = {
            label: field.label,
            type: field.type,
            // Default true: pre-existing fields (without the flag) keep showing.
            showInProfileDetail: field.options?.showInProfileDetail ?? true,
          };
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

  private processDynamicFields(): void {
    const values = this.userData?.profile?.dynamicFields;
    if (!values) {
      this.dynamicFields = [];
      return;
    }

    this.dynamicFields = Object.keys(values)
      .map((key) => this.formatDynamicField(this.dynamicFieldsDictionary[key], values[key]))
      .filter((item) => item && item.hasValue);
  }

  /** Turns a stored dynamic value into a display-ready { label, type, value } row. */
  private formatDynamicField(
    def: { label: string; type: string; showInProfileDetail: boolean } | undefined,
    raw: any,
  ): { label: string; type: string; value: any; hasValue: boolean } | null {
    if (!def?.label) return null;

    // Admin opted this field out of the public profile detail.
    if (def.showInProfileDetail === false) return null;

    // Location: { country, region, comuna } -> "País, Región, Comuna" (skip empties).
    if (def.type === CustomFieldType.LOCATION) {
      const loc = raw || {};
      const value = [loc.country, loc.region, loc.comuna].filter(Boolean).join(', ');
      return { label: def.label, type: 'string', value, hasValue: value !== '' };
    }

    if (isArray(raw)) {
      return { label: def.label, type: 'array', value: raw, hasValue: raw.length > 0 };
    }

    const value = raw === null || raw === undefined ? '' : String(raw);
    return { label: def.label, type: 'string', value, hasValue: value.trim() !== '' };
  }

  openEditProfileDetailModal() {
    const dialogRef = this._dialog.open(EditInfoProfileDetailComponent, {
      data: {
        userData: this.userData,
      }
    });

    const idUserCurrent = this.userData?._id;

    dialogRef.afterClosed().pipe(takeUntil(this.unsubscribe$)).subscribe(async result => {
      if (result && idUserCurrent) {
        await this._userService.getUserByIdFresh(idUserCurrent).pipe(takeUntil(this.unsubscribe$)).subscribe({
          next: (response: User) => {
            this.userData = response;
            this.processDynamicFields();
            this._cdr.markForCheck();
            this.userDataUpdated.emit(response);
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
