import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { WorkyButtonType, WorkyButtonTheme } from '@shared/modules/buttons/models/worky-button-model';
import { ProfileService } from '../../services/profile.service';
import { User } from '@shared/interfaces/user.interface';
import { UserService } from '@shared/services/users.service';
import { LoadingController } from '@ionic/angular';

@Component({
  selector: 'worky-edit-info-profile',
  templateUrl: './edit-info-profile.component.html',
  styleUrls: ['./edit-info-profile.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class EditInfoProfileDetailComponent implements OnInit {
  WorkyButtonType = WorkyButtonType;
  WorkyButtonTheme = WorkyButtonTheme;

  userData: User = {} as User;

  editProfileBasicDetailForm: FormGroup;
  editProfailDetailForm: FormGroup;

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
    console.log('whatsapp data:', this.editProfailDetailForm.get('whatsapp'));
  }

  toggleWhatsApp() {
    const isViewable = this.editProfailDetailForm.get('whatsapp.isViewable')?.value;
    if (isViewable) {
      isViewable.valueChanges.subscribe((value: any) => {
        console.log('Toggle value:', value);
      });
    }
  }

  async onSave() {

    if (this.editProfileBasicDetailForm.invalid) {
      return;
    }

    const loadingProfile = await this._loadingCtrl.create({
      message: 'Editando perfil...',
    });

    await loadingProfile.present();

    const dataBasicProfile = {
      name: this.editProfileBasicDetailForm.controls['name'].value,
      lastName: this.editProfileBasicDetailForm.controls['lastName'].value,
    }

    if (this.editProfailDetailForm.controls['legend'].value === '') {
      this.editProfailDetailForm.controls['legend'].setValue('null');
    }

    if (this.editProfailDetailForm.controls['dateOfBirth'].value === '') {
      this.editProfailDetailForm.controls['dateOfBirth'].setValue('null');
    }

    if (this.editProfailDetailForm.controls['description'].value === '') {
      this.editProfailDetailForm.controls['description'].setValue('null');
    }

    if (this.editProfailDetailForm.controls['sex'].value === '') {
      this.editProfailDetailForm.controls['sex'].setValue('null');
    }

    const dataProfile = {
      legend: this.editProfailDetailForm.controls['legend'].value,
      dateOfBirth: this.editProfailDetailForm.controls['dateOfBirth'].value,
      description: this.editProfailDetailForm.controls['description'].value,
      sex: this.editProfailDetailForm.controls['sex'].value,
      whatsapp: {
        number: this.editProfailDetailForm.controls['whatsapp'].get('number')?.value,
        isViewable: this.editProfailDetailForm.controls['whatsapp'].get('isViewable')?.value,
      }
    }

    await this._userService.userEdit(this.userData._id, dataBasicProfile).subscribe((res) => {
      this._profileService.updateProfile(this.userData._id, dataProfile).subscribe((res) => {
        this._dialogRef.close('saved');
        loadingProfile.dismiss();
      });
    });

    loadingProfile.dismiss();
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
