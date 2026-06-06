import { ChangeDetectorRef, Component, ElementRef, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LoadingController } from '@ionic/angular';

import { WorkyButtonType, WorkyButtonTheme } from '@shared/modules/buttons/models/worky-button-model';
import { RegisterData } from '@auth/interfaces/register.interface';
import { AuthApiRegisterService } from '@auth/services/apiRegister.service';
import { environment } from '@env/environment';
import { RoleUser } from '@auth/models/roleUser.enum';
import { MailSendValidateData } from '@shared/interfaces/mail.interface';
import { AlertService } from '@shared/services/alert.service';
import { translations } from '@translations/translations';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { TemplateEmail } from '@shared/interfaces/mail.interface';
import { Subject, takeUntil, finalize } from 'rxjs';
import { ConfigService } from '@shared/services/core-apis/config.service';

@Component({
    selector: 'worky-register',
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.scss'],
    standalone: false
})
export class RegisterComponent implements OnInit, OnDestroy {
  registerLoading: boolean = false;

  registerForm: FormGroup = new FormGroup({});

  WorkyButtonType = WorkyButtonType;

  WorkyButtonTheme = WorkyButtonTheme;

  mailDataValidate: MailSendValidateData = {} as MailSendValidateData;

  invitationCode = false;

  requirePrivacyPolicy = false;

  privacyPolicyContent = '';

  showPrivacyModal = false;

  private unsubscribe$ = new Subject<void>();

  @ViewChild('emailInput') emailInput!: ElementRef;

  @ViewChild('userNameInput') userNameInput!: ElementRef;

  constructor(
    private _formBuilder: FormBuilder,
    private _authApiRegisterService: AuthApiRegisterService,
    private _alertService: AlertService,
    private _loadingCtrl: LoadingController,
    private _configService: ConfigService,
    private _cdr: ChangeDetectorRef,
  ) {
    this._configService.getConfig().pipe(takeUntil(this.unsubscribe$)).subscribe((configData) => {
      this.invitationCode = configData.settings?.invitationCode ?? false;
      this.requirePrivacyPolicy = configData.settings?.requirePrivacyPolicy ?? false;
      this.privacyPolicyContent = configData.settings?.privacyPolicy || '';

      const invCode = this.registerForm.get('invitationCode');
      if (invCode) {
        invCode.setValidators(this.invitationCode ? [Validators.required] : []);
        invCode.updateValueAndValidity();
      }
      const privPolicy = this.registerForm.get('acceptedPrivacyPolicy');
      if (privPolicy) {
        privPolicy.setValidators(this.requirePrivacyPolicy ? [Validators.requiredTrue] : []);
        privPolicy.updateValueAndValidity();
      }

      this._cdr.markForCheck();
    });
  }

  get isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  get isIPhoneWithNotch(): boolean {
    return this.isIOS && window.screen.height >= 812;
  }

  ngOnInit() {
    this.registerForm = this._formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(4)]],
      lastName: ['', [Validators.required, Validators.minLength(4)]],
      username: ['', [Validators.required, Validators.minLength(4)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      invitationCode: ['', this.invitationCode ? [Validators.required] : []],
      acceptedPrivacyPolicy: [false, this.requirePrivacyPolicy ? [Validators.requiredTrue] : []],
      role: [RoleUser.USER],
    });

    if (this.isIPhoneWithNotch) {
      document.body.classList.add('iphone-with-notch');
    }
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  openPrivacyModal(): void {
    this.showPrivacyModal = true;
    this._cdr.markForCheck();
  }

  closePrivacyModal(): void {
    this.showPrivacyModal = false;
    this._cdr.markForCheck();
  }

  async register() {
    if (this.registerForm.invalid) return;

    this.registerLoading = true;

    const baseUrl = environment.BASE_URL;

    const loading = await this._loadingCtrl.create({
      message: translations['register.messageLoading'],
    });

    this.mailDataValidate.url = `${baseUrl}/auth/validate/`;
    this.mailDataValidate.subject = translations['email.validateEmailSubject'];
    this.mailDataValidate.title = `${translations['email.validateEmailTitle']} ${environment.META_TITLE}`;
    this.mailDataValidate.greet = translations['email.validateEmailGreet'];
    this.mailDataValidate.subMessage = translations['email.validateEmailSubMessage'];
    this.mailDataValidate.template = TemplateEmail.WELCOME;
    this.mailDataValidate.templateLogo = environment.TEMPLATE_EMAIL_LOGO;
    this.mailDataValidate.buttonMessage = this.invitationCode ? translations['email.validateEmailMessageRegisteredSubMessage'] : translations['email.validateEmailButtonMessage'];
    this.mailDataValidate.message = this.invitationCode ? translations['email.validateEmailMessageRegistered'] : translations['email.validateEmailMessage'];

    const body = this.registerForm.value as RegisterData;
    body.mailDataValidate = this.mailDataValidate;

    await loading.present();

    this._authApiRegisterService.registerUser(body).pipe(
      takeUntil(this.unsubscribe$),
      finalize(() => {
        this.registerLoading = false;
        this._cdr.markForCheck();
      }),
    ).subscribe({
      next: (response) => {
        const emailAlreadyVerified = (response as { isVerified?: boolean })?.isVerified ?? this.invitationCode;
        this._alertService.showAlert(
          emailAlreadyVerified ? translations['alert.title_success_register_verified'] : translations['alert.title_success_register'],
          emailAlreadyVerified ? translations['alert.message_success_register_verified'] : translations['alert.message_success_register'],
          Alerts.SUCCESS,
          Position.CENTER,
          true,
          translations['button.ok'],
          ['/auth/login'],
        );
        loading.dismiss();
      },
      error: (e) => {
        const msg: string = e?.error?.message || '';

        if (msg === 'E-mail is already in use') {
          this.registerForm.get('email')?.setErrors({ emailInUse: true });
          this.emailInput.nativeElement.focus();
          this._alertService.showAlert(
            translations['alert.title_error_register'],
            translations['alert.registerEmailInUse'],
            Alerts.ERROR,
            Position.CENTER,
            true,
            translations['button.ok'],
          );
        } else if (msg === 'Username is already in use') {
          this.registerForm.get('username')?.setErrors({ usernameInUse: true });
          this.userNameInput.nativeElement.focus();
          this._alertService.showAlert(
            translations['alert.title_error_register'],
            translations['alert.registerUsernameInUse'],
            Alerts.ERROR,
            Position.CENTER,
            true,
            translations['button.ok'],
          );
        } else if (msg === 'Failed send email') {
          this._alertService.showAlert(
            translations['alert.title_error_send_email'],
            translations['alert.message_error_send_email'],
            Alerts.INFO,
            Position.CENTER,
            true,
            translations['button.ok'],
            ['/auth/login'],
          );
        } else if (msg === 'Invalid invitation code' || msg === 'Invitation code is required') {
          this.registerForm.get('invitationCode')?.setErrors({ invalidInvitationCode: true });
          this._alertService.showAlert(
            translations['alert.title_error_register'],
            translations['alert.registerInvalidInvitationCode'],
            Alerts.ERROR,
            Position.CENTER,
            true,
            translations['button.ok'],
          );
        } else if (msg === 'Privacy policy acceptance is required') {
          this.registerForm.get('acceptedPrivacyPolicy')?.setErrors({ required: true });
          this._alertService.showAlert(
            translations['alert.title_error_register'],
            translations['alert.registerPrivacyPolicyRequired'],
            Alerts.ERROR,
            Position.CENTER,
            true,
            translations['button.ok'],
          );
        }

        loading.dismiss();
      }
    });
  }
}

