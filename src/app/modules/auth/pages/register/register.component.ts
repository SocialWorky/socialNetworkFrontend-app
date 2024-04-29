import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { WorkyButtonType, WorkyButtonTheme } from '../../../shared/buttons/models/worky-button-model';
import { RegisterData } from '../../interfaces/register.interface';
import { AuthApiRegisterService } from '../../services/apiRegister.service';

import { environment } from '../../../../../environments/environment';
import { RoleUser } from '../../models/roleUser.enum';
import { MailRegisterValidateData } from '../../interfaces/mail.interface';
import { AlertService } from '../../../shared/services/alert.service';
import { translations } from '../../../../../translations/translations';
import { Alerts, Position } from '../../../shared/enums/alerts.enum';

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

  mailDataValidate: MailRegisterValidateData = {} as MailRegisterValidateData;

  @ViewChild('emailInput') emailInput!: ElementRef;

  @ViewChild('userNameInput') userNameInput!: ElementRef;

  constructor(
    private _formBuilder: FormBuilder,
    private _authApiRegisterService: AuthApiRegisterService,
    private _alertService: AlertService,
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

    const baseUrl = environment.baseUrl;

    this.registerLoading = true;

    this.mailDataValidate.url = `${baseUrl}/auth/validate/`;
    this.mailDataValidate.subject = translations['email.validateEmailSubject'];
    this.mailDataValidate.title = translations['email.validateEmailTitle'];
    this.mailDataValidate.greet = translations['email.validateEmailGreet'];
    this.mailDataValidate.message = translations['email.validateEmailMessage'];
    this.mailDataValidate.subMessage = translations['email.validateEmailSubMessage'];
    this.mailDataValidate.buttonMessage = translations['email.validateEmailButtonMessage'];

    const body = this.registerForm.value as RegisterData;
    body.mailDataValidate = this.mailDataValidate;

    if (this.registerForm.invalid) return;
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
      }     
    });
  }
}

