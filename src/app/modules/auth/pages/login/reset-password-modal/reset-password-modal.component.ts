import { Component, EventEmitter, Inject, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { LoadingController } from '@ionic/angular';
import { WorkyButtonType, WorkyButtonTheme } from '../../../../shared/buttons/models/worky-button-model';
import { AuthApiService } from '../../../services/apiLogin.service';
import { MailSendValidateData } from '../../../../shared/interfaces/mail.interface';
import { environment } from '../../../../../../environments/environment';
import { AlertService } from '../../../../shared/services/alert.service';
import { Alerts, Position } from '../../../../shared/enums/alerts.enum';
import { translations } from '../../../../../../translations/translations';

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

    this.mailSendDataValidate.url = `${environment.baseUrl}/auth/login`;
    this.mailSendDataValidate.subject = 'Se ha restablecido tu contraseña';
    this.mailSendDataValidate.title = 'Contraseña restablecida';
    this.mailSendDataValidate.greet = 'Hola';
    this.mailSendDataValidate.message = 'Tu contraseña ha sido restablecida correctamente';
    this.mailSendDataValidate.subMessage = 'Si no has sido tú, por favor, ponte en contacto con nosotros.';
    this.mailSendDataValidate.buttonMessage = 'Iniciar sesión';
    this.mailSendDataValidate.token = this.data.token;
    this.mailSendDataValidate.password = password;

    if(password){

      const loading = await this._loadingCtrl.create({
        message: 'Cambiando contraseña, por favor espere..',
      });
      await loading.present();

      this.subscription = this._authApiService.resetPassword(this.mailSendDataValidate).subscribe({
        next: (response) => {
          if (response) {
            this._alertService.showAlert(
              'Contraseña restablecida correctamente',
              'Tu contraseña ha sido restablecida correctamente, por favor, inicia sesión.',
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
            'Error al restablecer la contraseña',
            'Ha ocurrido un error al restablecer la contraseña, por favor, inténtalo de nuevo.',
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
