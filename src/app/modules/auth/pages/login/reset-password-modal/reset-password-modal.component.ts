import { Component, EventEmitter, Inject, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { LoadingController } from '@ionic/angular';
import { WorkyButtonType, WorkyButtonTheme } from '@shared/modules/buttons/models/worky-button-model';
import { AuthApiService } from '@auth/services/apiLogin.service';
import { MailSendValidateData } from '@shared/interfaces/mail.interface';
import { environment } from '@env/environment';
import { AlertService } from '@shared/services/alert.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { translations } from '@translations/translations';
import { TemplateEmail } from '@shared/interfaces/mail.interface';

@Component({
  selector: 'worky-reset-password-modal',
  templateUrl: './reset-password-modal.component.html',
  styleUrls: ['./reset-password-modal.component.scss'],
})
export class ResetPasswordModalComponent  implements OnInit, OnDestroy {

  resetPasswordForm: FormGroup = new FormGroup({});

  WorkyButtonType = WorkyButtonType;

  WorkyButtonTheme = WorkyButtonTheme;

  mailSendDataValidate: MailSendValidateData = {} as MailSendValidateData;

  private subscription: Subscription = new Subscription();


  constructor (
    @Inject(MAT_DIALOG_DATA) public data: { token: string },
    private _formBuilder: FormBuilder,
    private _authApiService: AuthApiService,
    private _alertService: AlertService,
    private _loadingCtrl: LoadingController,
    private _dialog: MatDialog,
  ) { }

  ngOnInit() {
    this.resetPasswordForm = this._formBuilder.group({
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  async sendReset(){
    const password = this.resetPasswordForm.get('password')?.value;

    this.mailSendDataValidate.url = `${environment.BASE_URL}/auth/login`;
    this.mailSendDataValidate.subject = translations['email.confirmResetPasswordSubject'];
    this.mailSendDataValidate.title = translations['email.confirmResetPasswordTitle'];
    this.mailSendDataValidate.greet = translations['email.confirmResetPasswordGreet'];
    this.mailSendDataValidate.message = translations['email.confirmResetPasswordMessage'];
    this.mailSendDataValidate.subMessage = translations['email.validateEmailSubMessage'];
    this.mailSendDataValidate.buttonMessage = translations['email.confirmResetPasswordButtonMessage'];
    this.mailSendDataValidate.token = this.data.token;
    this.mailSendDataValidate.password = password;
    this.mailSendDataValidate.template = TemplateEmail.RESET_PASSWORD;

    if(password){

      const loading = await this._loadingCtrl.create({
        message: translations['resetPassword.messageLoading'],
      });
      await loading.present();

      this.subscription = this._authApiService.resetPassword(this.mailSendDataValidate).subscribe({
        next: (response) => {
          if (response) {
            this._alertService.showAlert(
              translations['resetPassword.alertResetPasswordTitle'],
              translations['resetPassword.alertResetPasswordMessage'],
              Alerts.SUCCESS,
              Position.CENTER,
              true,
              true,
              translations['button.ok'],
              ['/auth/login'],
            );
            this._dialog.closeAll();
            loading.dismiss();
           }
        },
        error: (error) => {
          this._alertService.showAlert(
            translations['resetPassword.alertErrorResetPasswordTitle'],
            translations['resetPassword.alertErrorResetPasswordMessage'],
            Alerts.ERROR,
            Position.CENTER,
            true,
            true,
            translations['button.ok'],
          );
          loading.dismiss();
        }
      });
    }
  }

}
