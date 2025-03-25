import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';

import { WorkyButtonType, WorkyButtonTheme } from '@shared/modules/buttons/models/worky-button-model';
import { ProfileService } from '../../services/profile.service';
import { User } from '@shared/interfaces/user.interface';
import { UserService } from '@shared/services/core-apis/users.service';
import { LoadingController } from '@ionic/angular';

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

  editProfileBasicDetailForm: FormGroup;

  editProfailDetailForm: FormGroup;

  private unsubscribe$ = new Subject<void>();

  constructor(
    @Inject(MAT_DIALOG_DATA) public dataUser: { userData: User },
    private _fb: FormBuilder,
    private _profileService: ProfileService,
    private _cdr: ChangeDetectorRef,
    private _dialogRef: MatDialogRef<EditInfoProfileDetailComponent>,
    private _userService: UserService,
    private _loadingCtrl: LoadingController,
  ) {
    this.editProfileBasicDetailForm = this._fb.group({
      name: ['', Validators.required],
      lastName: ['', Validators.required],
    });

    this.editProfailDetailForm = this._fb.group({
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
    this.loadBasicDetail();
  }

  toggleWhatsApp() {
    const isViewable = this.editProfailDetailForm.get('whatsapp.isViewable')?.value;
    if (isViewable) {
      isViewable.valueChanges.pipe(takeUntil(this.unsubscribe$)).subscribe();
    }
  }

  async onSave() {
    if (this.editProfileBasicDetailForm.invalid || this.editProfailDetailForm.invalid) {
      return;
    }

    try {
      const loadingProfile = await this._loadingCtrl.create({
        message: 'Editando perfil...',
      });
      await loadingProfile.present();
      const dataBasicProfile = this.prepareBasicProfileData();
      const dataProfile = this.prepareDetailedProfileData();
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
    const controls = this.editProfailDetailForm.controls;

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
    if (!this.userData) {
      return;
    }
    this.editProfileBasicDetailForm.controls['name'].setValue(this.userData.name);
    this.editProfileBasicDetailForm.controls['lastName'].setValue(this.userData.lastName);
    this.editProfailDetailForm.controls['legend'].setValue(this.userData?.profile?.legend);
    this.editProfailDetailForm.controls['dateOfBirth'].setValue(this.userData?.profile?.dateOfBirth);
    this.editProfailDetailForm.controls['description'].setValue(this.userData?.profile?.description);
    this.editProfailDetailForm.controls['sex'].setValue(this.userData?.profile?.sex);

    if (this.userData.profile.whatsapp) {
      this.editProfailDetailForm.controls['whatsapp'].get('number')?.setValue(this.userData.profile.whatsapp.number);
      this.editProfailDetailForm.controls['whatsapp'].get('isViewable')?.setValue(this.userData.profile.whatsapp.isViewable);
    }

    this._cdr.markForCheck();
  }
}
