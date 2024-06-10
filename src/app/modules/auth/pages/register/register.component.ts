import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
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

@Component({
  selector: 'worky-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent implements OnInit {
  registerLoading: boolean = false;

  registerForm: FormGroup = new FormGroup({});

  WorkyButtonType = WorkyButtonType;

  WorkyButtonTheme = WorkyButtonTheme;

  mailDataValidate: MailSendValidateData = {} as MailSendValidateData;

  @ViewChild('emailInput') emailInput!: ElementRef;

  @ViewChild('userNameInput') userNameInput!: ElementRef;

  constructor(
    private _formBuilder: FormBuilder,
    private _authApiRegisterService: AuthApiRegisterService,
    private _alertService: AlertService,
    private _loadingCtrl: LoadingController,
  ) {}

  ngOnInit() {
    this.registerForm = this._formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(4)]],
      lastName: ['', [Validators.required, Validators.minLength(4)]],
      username: ['', [Validators.required, Validators.minLength(4)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: [RoleUser.USER],
    });
  }

  async register() {

    this.registerLoading = true;
    
    const baseUrl = environment.BASE_URL;

    const loading = await this._loadingCtrl.create({
      message: translations['register.messageLoading'],
    });

    this.mailDataValidate.url = `${baseUrl}/auth/validate/`;
    this.mailDataValidate.subject = translations['email.validateEmailSubject'];
    this.mailDataValidate.title = translations['email.validateEmailTitle'];
    this.mailDataValidate.greet = translations['email.validateEmailGreet'];
    this.mailDataValidate.message = translations['email.validateEmailMessage'];
    this.mailDataValidate.subMessage = translations['email.validateEmailSubMessage'];
    this.mailDataValidate.buttonMessage = translations['email.validateEmailButtonMessage'];
    this.mailDataValidate.template = TemplateEmail.WELCOME;

    const body = this.registerForm.value as RegisterData;
    body.mailDataValidate = this.mailDataValidate;

    if (this.registerForm.invalid) return;

    await loading.present();

    await this._authApiRegisterService.registerUser(body).subscribe({
      next: () => {
        this._alertService.showAlert(
          translations['alert.title_success_register'],
          translations['alert.message_success_register'],
          Alerts.SUCCESS,
          Position.CENTER,
          true,
          true,
          translations['button.ok'],
          ['/auth/login'],
        );
        loading.dismiss();
      },
      error: (e) => {
        if (e.error.message === 'E-mail is already in use') {
          this.registerForm.get('email')?.setErrors({ emailInUse: true });
          this.registerForm.get('email')?.reset;
          this.emailInput.nativeElement.focus();
          this.registerLoading = false;

          this._alertService.showAlert(
            translations['alert.title_error_register'],
            translations['alert.registerEmailInUse'],
            Alerts.ERROR,
            Position.CENTER,
            true,
            true,
            translations['button.ok'],
          );
          loading.dismiss();
        }
        if (e.error.message === 'Username is already in use') {
          this.registerForm.get('username')?.setErrors({ usernameInUse: true });
          this.registerForm.get('username')?.reset;
          this.userNameInput.nativeElement.focus();
          this.registerLoading = false;

          this._alertService.showAlert(
            translations['alert.title_error_register'],
            translations['alert.registerUsernameInUse'],
            Alerts.ERROR,
            Position.CENTER,
            true,
            true,
            translations['button.ok'],
          );
          loading.dismiss();
        }
        if (e.error.message === 'Failed send email') {
          this._alertService.showAlert(
            translations['alert.title_error_send_email'],
            translations['alert.message_error_send_email'],
            Alerts.INFO,
            Position.CENTER,
            true,
            true,
            translations['button.ok'],
            ['/auth/login'],
          );
        }
        this.registerLoading = false;
        loading.dismiss();
      }     
    });
  }
}

