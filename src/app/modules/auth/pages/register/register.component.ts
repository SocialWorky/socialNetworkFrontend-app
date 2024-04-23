import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { WorkyButtonType, WorkyButtonTheme } from '../../../shared/buttons/models/worky-button-model';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RegisterData } from '../../interfaces/register.interface';
import { AuthApiRegisterService } from '../../services/apiRegister.service';
import { Router } from '@angular/router';
import { RoleUser } from '../../models/roleUser.enum';
import { MailRegisterValidateData } from '../../interfaces/mail.interface';

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

  constructor(
    private _formBuilder: FormBuilder,
    private _router: Router,
    private _authApiRegisterService: AuthApiRegisterService
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

    this.mailDataValidate.url = 'http://localhost:4200/auth/validate/';
    this.mailDataValidate.subject = 'Validate your email';
    this.mailDataValidate.title = 'Welcome to Worky';
    this.mailDataValidate.greet = 'Hello';
    this.mailDataValidate.message = 'To validate your email, click the button below';
    this.mailDataValidate.subMessage = 'If you did not register, ignore this email';
    this.mailDataValidate.buttonMessage = 'Validate email';

    const body = this.registerForm.value as RegisterData;
    body.mailDataValidate = this.mailDataValidate;

    if (this.registerForm.invalid) return;
    await this._authApiRegisterService.registerUser(body).subscribe({
      next: () => {
        this._router.navigate(['/auth/login']);
      },
      error: (e) => {
        if (e.error.message === 'E-mail is already in use') {
          this.registerForm.get('email')?.setErrors({ emailInUse: true });
          this.registerForm.get('email')?.reset;
          this.emailInput.nativeElement.focus();
          
          this.registerLoading = false;
          console.log('E-mail is already in use');
        }
        if (e.error.message === 'Username is already in use') {
          this.registerForm.get('username')?.setErrors({ usernameInUse: true });
          this.registerLoading = false;
          console.log('Username is already in use');
        }
        console.log(e.error);
      }     
    });
  }
}

