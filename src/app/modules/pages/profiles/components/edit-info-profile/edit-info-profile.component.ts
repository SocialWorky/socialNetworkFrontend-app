import { Component, Inject, OnInit, OnDestroy, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { map, Subject, Subscription, takeUntil } from 'rxjs';
import { translations } from '@translations/translations';
import { LoadingService } from '@shared/services/loading.service';

import { WorkyButtonType, WorkyButtonTheme } from '@shared/modules/buttons/models/worky-button-model';
import { ProfileService } from '../../services/profile.service';
import { User } from '@shared/interfaces/user.interface';
import { UserService } from '@shared/services/core-apis/users.service';
import { CustomFieldService } from '@shared/services/core-apis/custom-field.service';
import { Field } from '@shared/modules/form-builder/interfaces/field.interface';
import { CustomFieldDestination, CustomFieldType } from '@shared/modules/form-builder/interfaces/custom-field.interface';
import { buildDynamicFieldValidators } from '@shared/modules/form-builder/data/dynamic-field-validators';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';

@Component({
    selector: 'worky-edit-info-profile',
    templateUrl: './edit-info-profile.component.html',
    styleUrls: ['./edit-info-profile.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: false
})
export class EditInfoProfileDetailComponent implements OnInit, OnDestroy {
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

  private cascadeSubs: Subscription[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public dataUser: { userData: User },
    private _fb: FormBuilder,
    private _profileService: ProfileService,
    private _cdr: ChangeDetectorRef,
    private _dialogRef: MatDialogRef<EditInfoProfileDetailComponent>,
    private _userService: UserService,
    private _loadingService: LoadingService,
    private _customFieldService: CustomFieldService,
    private _logService: LogService,
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
    this.toggleWhatsApp();
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

          const validators = buildDynamicFieldValidators(field.type, field.options);
          const initial = field.type === CustomFieldType.BOOLEAN ? false : '';

          group[field.id] = new FormControl(initial, validators);

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
            cascade: field.options?.cascade || undefined,
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

        // Wire cascading selects (e.g. Country -> Region -> City) AFTER saved
        // values are patched, so children populate from the current parent value.
        this.setupProfileCascade();

        this._cdr.markForCheck();
      });
  }

  /**
   * Subscribes each cascading child select to its parent's value changes and
   * seeds its options from the currently-selected parent value.
   */
  private setupProfileCascade(): void {
    this.cascadeSubs.forEach((sub) => sub.unsubscribe());
    this.cascadeSubs = [];

    this.dynamicFields.forEach((child) => {
      const dependsOn = child.cascade?.dependsOn;
      if (!dependsOn) return;

      const parent = this.dynamicFields.find((f) => f.idName === dependsOn);
      if (!parent) return;

      const parentControl = this.dynamicFieldsForm.get(parent.id);
      if (!parentControl) return;

      // Seed from the saved parent value without clearing the saved child value.
      this.applyCascadeChild(child, parentControl.value, false);

      const sub = parentControl.valueChanges
        .pipe(takeUntil(this.unsubscribe$))
        .subscribe((value: any) => this.applyCascadeChild(child, value, true));
      this.cascadeSubs.push(sub);
    });
  }

  private applyCascadeChild(child: Field, parentValue: any, reset: boolean): void {
    child.options = child.cascade?.optionsByParent?.[parentValue] || [];

    if (reset) {
      // emitEvent: true so grandchildren (e.g. City under Region) also reset.
      this.dynamicFieldsForm.get(child.id)?.setValue('', { emitEvent: true });
    }

    this._cdr.markForCheck();
  }

  isInputFieldType(type?: string): boolean {
    return !!type && ['text', 'number', 'email', 'phone', 'url', 'date'].includes(type);
  }

  cascadeDepth(field: Field): number {
    let depth = 0;
    let current: Field | undefined = field;
    const guard = new Set<string>();

    while (current?.cascade?.dependsOn && !guard.has(current.idName)) {
      guard.add(current.idName);
      const parentIdName: string = current.cascade.dependsOn;
      current = this.dynamicFields.find((f) => f.idName === parentIdName);
      if (!current) break;
      depth++;
    }

    return depth;
  }

  ngOnDestroy(): void {
    this.cascadeSubs.forEach((sub) => sub.unsubscribe());
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  toggleWhatsApp() {
    const isViewableControl = this.editProfileDetailForm.get('whatsapp.isViewable');
    if (isViewableControl) {
      isViewableControl.valueChanges.pipe(takeUntil(this.unsubscribe$)).subscribe((value) => {
        // Trigger change detection when toggle changes
        this._cdr.markForCheck();
      });
    }
  }

  onWhatsAppToggleChange(event: any) {
    const isViewableControl = this.editProfileDetailForm.get('whatsapp.isViewable');
    if (isViewableControl) {
      isViewableControl.setValue(event.target.checked);
      this._cdr.markForCheck();
    }
  }

  async onSave() {
    if (this.editProfileBasicDetailForm.invalid || this.editProfileDetailForm.invalid) {
      return;
    }

    if (this.dynamicFieldsForm?.invalid) {
      this.dynamicFieldsForm.markAllAsTouched();
      this._cdr.markForCheck();
      return;
    }

    // Use accessible loading for better UX consistency
    const accessibleLoading = this._loadingService.createAccessibleLoading(
      translations['pages.editInfoProfile.loading'],
      translations['pages.editInfoProfile.loading.subMessage']
    );
    const loadingElement = accessibleLoading.show();

    try {
      const dataBasicProfile = this.prepareBasicProfileData();
      const dataProfile = this.prepareDetailedProfileData();

      const dynamicFieldsToSave = this.dynamicFieldsForm.value;

      dataProfile.dynamicFields = dynamicFieldsToSave;

      await this.updateUserData(dataBasicProfile);
      await this.updateUserProfile(dataProfile);

      this._dialogRef.close('saved');
      
      // Hide loading on success
      accessibleLoading.hide(loadingElement);
    } catch (error) {
      // Hide loading on error
      accessibleLoading.hide(loadingElement);
      
      this._logService.log(
        LevelLogEnum.ERROR,
        'EditInfoProfileDetailComponent',
        'Error saving profile changes.',
        {
          user: this.userData,
          message: error,
          dataBasic: this.editProfileBasicDetailForm.value,
          dataProfile: this.editProfileDetailForm.value,
          dynamicFields: this.dynamicFieldsForm.value,
        },
      );
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
