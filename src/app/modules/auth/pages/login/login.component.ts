import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { WorkyButtonType, WorkyButtonTheme } from '../../../shared/buttons/models/worky-button-model';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { LoadingController } from '@ionic/angular';
import { MatDialog } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthGoogleService } from '../../services/auth-google.service';
import { AlertService } from '../../../shared/services/alert.service';

import { AuthApiService } from '../../services/apiLogin.service';
import { LoginData } from '../../interfaces/login.interface';
import { translations } from '../../../../../translations/translations';
import { Alerts, Position } from '../../../shared/enums/alerts.enum';
import { AuthService } from '../../services/auth.service';
import { MailSendValidateData } from '../../../shared/interfaces/mail.interface';
import { environment } from '../../../../../environments/environment';
import { ResetPasswordModalComponent } from './reset-password-modal/reset-password-modal.component';
import { TemplateEmail } from '../../../shared/interfaces/mail.interface';

@Component({
  selector: 'worky-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit, OnDestroy { 
  loginForm: FormGroup = new FormGroup({});

  WorkyButtonType = WorkyButtonType;

  WorkyButtonTheme = WorkyButtonTheme;

  token = localStorage.getItem('token');

  googleLoginSession = localStorage.getItem('googleLogin');

  mailSendDataValidate: MailSendValidateData = {} as MailSendValidateData;

  showResetPasswordModal = false;


  private subscription: Subscription = new Subscription();

  constructor (
    private _authApiService: AuthApiService,
    private _router: Router,
    private _activatedRoute: ActivatedRoute,
    private _loadingCtrl: LoadingController,
    private _formBuilder: FormBuilder,
    private _alertService: AlertService,
    private _cdr: ChangeDetectorRef,
    private _authGoogleService: AuthGoogleService,
    private _authService: AuthService,
    private _dialog: MatDialog,
  ) { 

    if (this.token) {
      this._router.navigate(['/home']);
    }
  }

  ngOnInit() {
    this.checkSessionGoogle();
    this._activatedRoute.paramMap.subscribe(params => {
      const tokenPassword = params.get('tokenPassword');
      const token = params.get('token');
      if (token) {
        this.validateEmailWithToken(token);
      }
      if (tokenPassword) {
        this.openResetPasswordModal(tokenPassword);
      }
    });

    this.loginForm = this._formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this._cdr.detectChanges();

  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  checkSessionGoogle() {
    setTimeout(() => {
      if (sessionStorage.getItem('id_token')) {
        if (!this.token) {
          this.loginGoogle();
        }
      }
      this._cdr.detectChanges();
    }, 500);
  }

  async login() {
    const email = this.loginForm.get('email')?.value;
    const password = this.loginForm.get('password')?.value;

    if (!this.loginForm.valid) {
      this._alertService.showAlert(
        translations['alert.title_error_credentials'],
        translations['login.emailOrPasswordIncorrect'],
        Alerts.ERROR,
        Position.CENTER,
        true,
        true,
        translations['button.ok'],
      );
      return;
    }

    const credentials: LoginData = { email, password };

    const loading = await this._loadingCtrl.create({
      message: translations['login.messageLoading'],
    });

    await loading.present();

    this.subscription = this._authApiService.loginUser(credentials).subscribe({
      next: (response: any) => {
        if (response && response.token) {
          localStorage.setItem('token', response.token);
          this._router.navigate(['/home']);
        }
      },
      error: (e: any) => {
        console.log(e);
        if (e.error.message === 'User is not verified') {
          this._alertService.showAlert(
            translations['alert.title_emailValidated_error'],
            translations['alert.message_emailValidated_error'],
            Alerts.ERROR,
            Position.CENTER,
            true,
            true,
            translations['button.ok'],
          );
          loading.dismiss();
        }
        if (e.error.message === 'Unauthorized access. Please provide valid credentials to access this resource') {
          this._alertService.showAlert(
            translations['alert.title_error_credentials'],
            translations['alert.message_error_credentials'],
            Alerts.ERROR,
            Position.CENTER,
            true,
            true,
            translations['button.ok'],
          );
          loading.dismiss();
        }
        if (e.status === 500) {
          this._alertService.showAlert(
            translations['alert.title_error_server'],
            translations['alert.message_error_server'],
            Alerts.ERROR,
            Position.CENTER,
            true,
            true,
            translations['button.ok'],
          );
          loading.dismiss();
        }
      },
      complete: () => {
        loading.dismiss();
      }
    });
  }

  async loginGoogle() {

    const loading = await this._loadingCtrl.create({
      message: translations['login.messageLoading'],
    });

    await loading.present();

    const loginDataGoogle: any = this._authGoogleService.getProfile();

    if (!loginDataGoogle) {
      await this._authGoogleService.login();
      return;
    }

    localStorage.setItem('googleLogin', JSON.stringify(loginDataGoogle));

    const dataGoogle = {
      token: sessionStorage.getItem('id_token') || '',
      username: await this._authService.generateUserName(loginDataGoogle.email, loginDataGoogle.given_name, loginDataGoogle.family_name),
      name: loginDataGoogle.given_name,
      lastName: loginDataGoogle.family_name,
      email: loginDataGoogle.email,
      password: await this._authService.generatePassword(),
    };

    this.subscription = await this._authApiService.loginGoogle(dataGoogle).subscribe({
      next: (response: any) => {
        localStorage.setItem('token', response.token);
        this._router.navigate(['/home']);
      }
    });
    loading.dismiss();
  }

  async validateEmailWithToken(token: string) {
    const loading = await this._loadingCtrl.create({
      message: translations['login.messageValidationEmailLoading'],
    });
    await loading.present();

    this.subscription = this._authApiService.validateEmailWithToken(token).subscribe({
      next: (response: any) => {
        if (response && response.message) {
          this._alertService.showAlert(
            translations['alert.title_emailValidated_success'],
            translations['alert.message_emailValidated_success'],
            Alerts.SUCCESS,
            Position.CENTER,
            true,
            true,
            translations['button.ok'],
          );
        }
      },
      error: (e: any) => {
        this._alertService.showAlert(
          translations['alert.title_emailValidated_error'],
          translations['alert.message_emailValidated_error'],
          Alerts.ERROR,
          Position.CENTER,
          true,
          true,
          translations['button.ok'],
        );
        loading.dismiss();
      },
      complete: () => {
        loading.dismiss();
      }
    });
  }

  async forgotPassword() {
    const email = this.loginForm.get('email')?.value;

    this.mailSendDataValidate.url = `${environment.BASE_URL}/auth/reset-password/`;
    this.mailSendDataValidate.subject = translations['email.resetPasswordSubject'];
    this.mailSendDataValidate.title = translations['email.resetPasswordTitle'];
    this.mailSendDataValidate.greet = translations['email.resetPasswordGreet'];
    this.mailSendDataValidate.message = translations['email.resetPasswordMessage'];
    this.mailSendDataValidate.subMessage = translations['email.resetPasswordSubMessage'];
    this.mailSendDataValidate.buttonMessage = translations['email.resetPasswordButtonMessage'];
    this.mailSendDataValidate.template = TemplateEmail.FORGOT_PASSWORD;


    if (!this.loginForm.get('email')?.valid) {
      this._alertService.showAlert(
        translations['alert.title_error_credentials'],
        translations['login.emailIncorrect'],
        Alerts.ERROR,
        Position.CENTER,
        true,
        true,
        translations['button.ok'],
      );
      return;
    }

    this.mailSendDataValidate.email = email;

    const loading = await this._loadingCtrl.create({
      message: translations['login.messageResetPasswordLoading'],
    });

    await loading.present();

    this.subscription = this._authApiService.forgotPassword(this.mailSendDataValidate).subscribe({
      next: (response: any) => {
        if (response && response.message) {
          this._alertService.showAlert(
            translations['alert.title_reset_password_message'],
            translations['alert.message_reset_password_message'],
            Alerts.SUCCESS,
            Position.CENTER,
            true,
            true,
            translations['button.ok'],
          );
        }
      },
      error: (e: any) => {
        if (e.error.message === 'Email not exist in the database or is invalid') {
          this._alertService.showAlert(
            translations['alert.error_email_title_reset_password'],
            translations['alert.error_email_message_reset_password'],
            Alerts.ERROR,
            Position.CENTER,
            true,
            true,
            translations['button.ok'],
          );
          loading.dismiss();
        }
        if (e.error.message === 'Failed to send email') {
          this._alertService.showAlert(
            translations['alert.error_send_email_title_reset_password'],
            translations['alert.error_send_email_message_reset_password'],
            Alerts.ERROR,
            Position.CENTER,
            true,
            true,
            translations['button.ok'],
          );
          loading.dismiss();
        }
      },
      complete: () => {
        loading.dismiss();
      }
    });
  }

  async openResetPasswordModal(token: string) {
    this.showResetPasswordModal = true;
    const dialogRef = this._dialog.open(ResetPasswordModalComponent, {
      data: { token },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      this.showResetPasswordModal = false;
    });
  }

  closeResetPasswordModal() {
    this.showResetPasswordModal = false;
    this._dialog.closeAll();
  }

}
