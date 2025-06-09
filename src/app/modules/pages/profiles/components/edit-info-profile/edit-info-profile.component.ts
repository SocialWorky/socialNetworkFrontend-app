import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { map, Subject, takeUntil } from 'rxjs';

import { WorkyButtonType, WorkyButtonTheme } from '@shared/modules/buttons/models/worky-button-model';
import { ProfileService } from '../../services/profile.service';
import { User } from '@shared/interfaces/user.interface';
import { UserService } from '@shared/services/core-apis/users.service';
import { LoadingController } from '@ionic/angular';
import { CustomFieldService } from '@shared/services/core-apis/custom-field.service';
import { Field } from '@shared/modules/form-builder/interfaces/field.interface';
import { CustomFieldDestination, CustomFieldType } from '@shared/modules/form-builder/interfaces/custom-field.interface';

@Component({
    selector: 'worky-edit-info-profile',
    templateUrl: './edit-info-profile.component.html',
    styleUrls: ['./edit-info-profile.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: false
})
export class EditInfoProfileDetailComponent implements OnInit {
  WorkyButtonType = WorkyButtonType;

  WorkyButtonTheme = WorkyButtonTheme;

  userData: User = {} as User;

  dataOk = false;

  editProfileBasicDetailForm: FormGroup;

  editProfileDetailForm: FormGroup;

  dynamicFieldsForm!: FormGroup;

  dynamicFields: Field[] = [];

  enumCustomFieldType = CustomFieldType;

  SeeDynamicFields = false;

  private unsubscribe$ = new Subject<void>();

  constructor(
    @Inject(MAT_DIALOG_DATA) public dataUser: { userData: User },
    private _fb: FormBuilder,
    private _profileService: ProfileService,
    private _cdr: ChangeDetectorRef,
    private _dialogRef: MatDialogRef<EditInfoProfileDetailComponent>,
    private _userService: UserService,
    private _loadingCtrl: LoadingController,
    private _customFieldService: CustomFieldService,
  ) {
    this.editProfileBasicDetailForm = this._fb.group({
      name: ['', Validators.required],
      lastName: ['', Validators.required],
    });

    this.editProfileDetailForm = this._fb.group({
      legend: [''],
      dateOfBirth: [''],
      description: [''],
      sex: [''],
      whatsapp: this._fb.group({
        number: [''],
        isViewable: [false]
      })
    });

    if (dataUser) {
      this.userData = dataUser.userData;
      this._cdr.markForCheck();
    }
  }

  ngOnInit() {
    this.getDynamicFieldsFormControls();
  }

  getDynamicFieldsFormControls(): void {
    this._customFieldService.getCustomFields()
      .pipe(
        takeUntil(this.unsubscribe$),
        map((fields: any[]) => fields.filter(field => field.destination === CustomFieldDestination.PROFILE))
      )
      .subscribe(filteredFields => {
        const group: Record<string, FormControl> = {};

        filteredFields.forEach((field: any) => {

          const validators = [];
          if (field.options?.required) validators.push(Validators.required);
          if (field.options?.maxLength > 0) validators.push(Validators.maxLength(field.options.maxLength));
          if (field.options?.minLength > 0) validators.push(Validators.minLength(field.options.minLength));

          group[field.id] = new FormControl('', validators);

          this.dynamicFields.push({
            id: field.id,
            index: field.index,
            idName: field.idName,
            type: field.type,
            label: field.label,
            isActive: field.isActive,
            options: field.options?.choices || [],
            required: field.options?.required || false,
            placeholder: field.options?.placeholder || '',
            destination: field.destination,
            additionalOptions: {
              multiSelect: field.options?.multiSelect || false,
              visible: field.options?.visible || true,
              required: field.options?.required || false,
              minLength: field.options?.minLength || 0,
              maxLength: field.options?.maxLength || 50
            }
          });
        });

        this.dynamicFieldsForm = this._fb.group(group);

        this.dataOk = true;

        this.loadBasicDetail();

        this._cdr.markForCheck();
      });
  }

  toggleWhatsApp() {
    const isViewable = this.editProfileDetailForm.get('whatsapp.isViewable')?.value;
    if (isViewable) {
      isViewable.valueChanges.pipe(takeUntil(this.unsubscribe$)).subscribe();
    }
  }

  async onSave() {
    if (this.editProfileBasicDetailForm.invalid || this.editProfileDetailForm.invalid) {
      return;
    }

    try {
      const loadingProfile = await this._loadingCtrl.create({
        message: 'Editando perfil...',
      });
      await loadingProfile.present();
      const dataBasicProfile = this.prepareBasicProfileData();
      const dataProfile = this.prepareDetailedProfileData();

      const dynamicFieldsToSave = this.dynamicFieldsForm.value;

      dataProfile.dynamicFields = dynamicFieldsToSave;

      await this.updateUserData(dataBasicProfile);
      await this.updateUserProfile(dataProfile);

      this._dialogRef.close('saved');
    } catch (error) {
      console.error('Error al guardar los cambios:', error);
    } finally {
      await this.dismissLoading();
    }
  }

  private prepareBasicProfileData(): any {
    return {
      name: this.editProfileBasicDetailForm.controls['name'].value,
      lastName: this.editProfileBasicDetailForm.controls['lastName'].value,
    };
  }

  private prepareDetailedProfileData(): any {
    const controls = this.editProfileDetailForm.controls;

    const legend = controls['legend'].value || null;
    const dateOfBirth = controls['dateOfBirth'].value || null;
    const description = controls['description'].value || null;
    const sex = controls['sex'].value || null;

    const whatsapp = {
      number: controls['whatsapp'].get('number')?.value || null,
      isViewable: controls['whatsapp'].get('isViewable')?.value || null,
    };

    return {
      legend,
      dateOfBirth,
      description,
      sex,
      whatsapp,
    };
  }

  private async updateUserData(data: any): Promise<void> {
    await this._userService.userEdit(this.userData._id, data).pipe(takeUntil(this.unsubscribe$)).toPromise();
  }

  private async updateUserProfile(data: any): Promise<void> {
    await this._profileService.updateProfile(this.userData._id, data).pipe(takeUntil(this.unsubscribe$)).toPromise();
  }

  private async dismissLoading(): Promise<void> {
    const loadingProfile = await this._loadingCtrl.getTop();
    if (loadingProfile) {
      await loadingProfile.dismiss();
    }
  }

  loadBasicDetail() {
    if (!this.userData) return;

    this.editProfileBasicDetailForm.patchValue({
      name: this.userData.name,
      lastName: this.userData.lastName
    });

    this.editProfileDetailForm.patchValue({
      legend: this.userData?.profile?.legend || '',
      dateOfBirth: this.userData?.profile?.dateOfBirth || '',
      description: this.userData?.profile?.description || '',
      sex: this.userData?.profile?.sex || ''
    });

    if (this.userData.profile?.whatsapp) {
      this.editProfileDetailForm.get('whatsapp')?.patchValue({
        number: this.userData.profile.whatsapp.number,
        isViewable: this.userData.profile.whatsapp.isViewable
      });
    }

    if (this.userData.profile?.dynamicFields && this.dynamicFieldsForm) {
      this.dynamicFieldsForm.patchValue(this.userData.profile.dynamicFields, { emitEvent: false });
    }

    this._cdr.markForCheck();
  }
}
