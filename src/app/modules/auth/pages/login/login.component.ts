import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { async, last, Subject, takeUntil } from 'rxjs';
import { LoadingController } from '@ionic/angular';
import { MatDialog } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { WorkyButtonType, WorkyButtonTheme } from '@shared/modules/buttons/models/worky-button-model';
import { AuthGoogleService } from '@auth/services/auth-google.service';
import { AlertService } from '@shared/services/alert.service';
import { AuthApiService } from '@auth/services/apiLogin.service';
import { LoginData } from '@auth/interfaces/login.interface';
import { translations } from '@translations/translations';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { AuthService } from '@auth/services/auth.service';
import { ResetPasswordModalComponent } from './reset-password-modal/reset-password-modal.component';
import { DeviceDetectionService } from '@shared/services/DeviceDetection.service';
import { SocketService } from '@shared/services/socket.service';
import { NotificationUsersService } from '@shared/services/notifications/notificationUsers.service';
import { EmailNotificationService } from '@shared/services/notifications/email-notification.service';
import { ConfigService } from '@shared/services/core-apis/config.service';
import { MetaTagService } from '@shared/services/meta-tag.service';
import { LoginMethods } from './interfaces/login.interface';

@Component({
  selector: 'worky-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit, OnDestroy, AfterViewInit {
  loginForm: FormGroup = new FormGroup({});

  WorkyButtonType = WorkyButtonType;

  WorkyButtonTheme = WorkyButtonTheme;

  token = localStorage.getItem('token');

  googleLoginSession = localStorage.getItem('googleLogin');

  loginMethods: LoginMethods | undefined;

  private readonly storageThreshold = 24 * 60 * 60 * 1000; // 24 hours

  private destroy$ = new Subject<void>();

  @ViewChild('emailInput') emailInput!: ElementRef;

  private unsubscribe$ = new Subject<void>();

  constructor(
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
    private _deviceDetectionService: DeviceDetectionService,
    private _socketService: SocketService,
    private _notificationUsersService: NotificationUsersService,
    private _emailNotificationService: EmailNotificationService,
    private _configService: ConfigService,
    private _metaTagService: MetaTagService,
  ) {
    this._configService.getConfig().pipe(takeUntil(this.destroy$)).subscribe((configData) => {
      const title = configData.settings.title + ' - Login';
      const description = configData.settings.description;
      const imageUrl = configData.settings.logoUrl;
      const urlSite = configData.settings.urlSite;
      this.loginMethods = JSON.parse(configData.settings.loginMethods);
      this._metaTagService.updateMetaTags(title, description, imageUrl, urlSite );
      this._cdr.markForCheck();
    });
    if (this.token) {
      this._router.navigate(['/home']);
    }
  }

  ngOnInit() {
    this.chechLastLogin();
    this.checkSessionGoogle();
    this.loginForm = this._formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

    this._cdr.markForCheck();
  }

  async ngAfterViewInit() {

    const tokenValidate = await this._activatedRoute.snapshot.paramMap.get('token');
    const tokenPassword = await this._activatedRoute.snapshot.paramMap.get('tokenPassword');

    if (tokenValidate) this.validateEmailWithToken(tokenValidate);
  
    this._dialog.afterOpened.pipe(takeUntil(this.unsubscribe$)).subscribe(() => {
      this._dialog.openDialogs.forEach(dialog => {
        dialog.id === 'mat-mdc-dialog-1' ? dialog.close() : null;
      });
    });

    if (tokenPassword ) {
      this.openResetPasswordModal(tokenPassword);
    }
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  private chechLastLogin() {
    const lastLogin = localStorage.getItem('lastLogin');
    if (lastLogin) {
      const lastLoginDate = new Date(lastLogin);
      const currentDate = new Date();
      const difference = currentDate.getTime() - lastLoginDate.getTime();
      if (difference > this.storageThreshold) {
        localStorage.clear();
        sessionStorage.clear();
      } else {
        localStorage.setItem('lastLogin', new Date().toISOString());
      }
    }
  }

  async checkSessionGoogle() {
    setTimeout(() => {
      if (sessionStorage.getItem('id_token')) {
        if (!this.token) {
          this.loginGoogle();
        }
      }
      this._cdr.markForCheck();
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

    const credentials: LoginData = {
      email: email.toLowerCase(),
      password: password,
    };

    const loading = await this._loadingCtrl.create({
      message: translations['login.messageLoading'],
    });

    await loading.present();

    await this._authApiService.loginUser(credentials).pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: async (response: any) => {
        if (response && response.token) {
          localStorage.setItem('token', response.token);

          localStorage.setItem('lastLogin', new Date().toISOString());

          const tokenResponse = await this._authService.getDecodedToken()!;

          this._socketService.connectToWebSocket(tokenResponse);

          this._notificationUsersService.loginUser();

          this._cdr.markForCheck();

          if (tokenResponse?.role === 'admin' && !this._deviceDetectionService.isMobile()) {
            this._router.navigate(['/admin']);
          } else {
            this._router.navigate(['/home']);
          }
        }
      },
      error: (e: any) => {
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

    localStorage.setItem('lastLogin', new Date().toISOString());

    const dataGoogle = {
      token: sessionStorage.getItem('id_token') || '',
      username: await this._authService.generateUserName(loginDataGoogle.email, loginDataGoogle.given_name, loginDataGoogle.family_name),
      name: loginDataGoogle.given_name,
      lastName: loginDataGoogle.family_name,
      email: loginDataGoogle.email,
      password: await this._authService.generatePassword(),
    };

    await this._authApiService.loginGoogle(dataGoogle).pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: async (response: any) => {

        localStorage.setItem('token', response.token);

        const avatar = await this._authService.getDecodedToken()?.avatar;

        if(!avatar) {
          const userId = await this._authService.getDecodedToken()?.id!;

          await this._authApiService.avatarUpdate(userId, loginDataGoogle.picture, response.token).pipe(takeUntil(this.unsubscribe$)).subscribe({
            next: async (response: any) => {
              if (response) {
                await this._authService.renewToken(userId);
                this.token = localStorage.getItem('token');
                loading.dismiss();
                this._notificationUsersService.loginUser();
                this._cdr.markForCheck();
                this._router.navigate(['/home']);
              }
            },
            error: (e: any) => {
              loading.dismiss();
              this._router.navigate(['/home']);
            }
          });
        }

        const token = this._authService.getDecodedToken()!;
        this._socketService.connectToWebSocket(token);
        this._notificationUsersService.loginUser();

        this._cdr.markForCheck();
        this._router.navigate(['/home']);

      },
    });

    loading.dismiss();
  }

  async validateEmailWithToken(tokenValidate: string) {
    const loading = await this._loadingCtrl.create({
      message: translations['login.messageValidationEmailLoading'],
    });
    await loading.present();

    await this._authApiService.validateEmailWithToken(tokenValidate).pipe(takeUntil(this.unsubscribe$)).subscribe({
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

    if (!email) {
      this.loginForm.get('email')?.setErrors({ emailInValid: true });
      this.loginForm.get('email')?.reset;
      this.emailInput.nativeElement.focus();
      this._alertService.showAlert(
        translations['alert.error_input_email_title'],
        translations['alert.error_input_email_message'],
        Alerts.ERROR,
        Position.CENTER,
        true,
        true,
        translations['button.ok'],
      );
      return;
    }

    const emailResponse = await this._emailNotificationService.sendEmailToRecoverPassword(email);

    const loading = await this._loadingCtrl.create({
      message: translations['login.messageResetPasswordLoading'],
    });

    await loading.present();

    await this._authApiService.forgotPassword(emailResponse).pipe(takeUntil(this.unsubscribe$)).subscribe({
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
          this.loginForm.get('email')?.setErrors({ emailInValid: true });
          this.loginForm.get('email')?.reset;
          this.emailInput.nativeElement.focus();
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
    const dialogRef = this._dialog.open(ResetPasswordModalComponent, {
      data: { token },
    });
    this._cdr.markForCheck();
    
    dialogRef.afterClosed().subscribe(result => {
      this.closeResetPasswordModal();
    });
  }

 closeResetPasswordModal() {
    this._dialog.closeAll();
    this._cdr.detectChanges();
  }
}
