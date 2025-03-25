import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { LoadingController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subscription } from 'rxjs';

import { WorkyButtonType, WorkyButtonTheme } from '@shared/modules/buttons/models/worky-button-model';
import { AuthApiService } from '@auth/services/apiLogin.service';
import { AlertService } from '@shared/services/alert.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { translations } from '@translations/translations';
import { AuthService } from '@auth/services/auth.service';
import { EmailNotificationService } from '@shared/services/notifications/email-notification.service';

@Component({
    selector: 'worky-reset-password-modal',
    templateUrl: './reset-password-modal.component.html',
    styleUrls: ['./reset-password-modal.component.scss'],
    standalone: false
})
export class ResetPasswordModalComponent implements OnInit, OnDestroy {

  resetPasswordForm: FormGroup = new FormGroup({});

  WorkyButtonType = WorkyButtonType;

  WorkyButtonTheme = WorkyButtonTheme;

  private subscription: Subscription = new Subscription();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { token: string },
    private _formBuilder: FormBuilder,
    private _authApiService: AuthApiService,
    private _alertService: AlertService,
    private _loadingCtrl: LoadingController,
    private _dialogRef: MatDialogRef<ResetPasswordModalComponent>,
    private _authService: AuthService,
    private _emailNotificationService: EmailNotificationService,
  ) { }

  ngOnInit() {
    this.resetPasswordForm = this._formBuilder.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  async sendReset() {
    const password = this.resetPasswordForm.get('password')?.value;
    const emailUser = this._authService.getUseFromToken(this.data.token).email;

    const emailResponse = await this._emailNotificationService.sendEmailToResetPassword(emailUser, this.data.token, password);

    if (password) {
      const loading = await this._loadingCtrl.create({
        message: translations['resetPassword.messageLoading'],
      });
      await loading.present();

      this.subscription = this._authApiService.resetPassword(emailResponse).subscribe({
        next: (response) => {
          if (response) {
            this._alertService.showAlert(
              translations['resetPassword.alertResetPasswordTitle'],
              translations['resetPassword.alertResetPasswordMessage'],
              Alerts.SUCCESS,
              Position.CENTER,
              true,
              translations['button.ok'],
              ['/auth/login'],
            );
            loading.dismiss();
            this._dialogRef.close(response);
          }
        },
        error: (error) => {
          this._alertService.showAlert(
            translations['resetPassword.alertErrorResetPasswordTitle'],
            translations['resetPassword.alertErrorResetPasswordMessage'],
            Alerts.ERROR,
            Position.CENTER,
            true,
            translations['button.ok']
          );
          loading.dismiss();
        },
      });
    }
  }

}
