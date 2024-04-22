import { Component, OnInit } from '@angular/core';
import { WorkyButtonType, WorkyButtonTheme } from '../../../shared/buttons/models/worky-button-model';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RegisterData } from '../../interfaces/register.interface';
import { AuthApiRegisterService } from '../../services/apiRegister.service';
import { Router } from '@angular/router';
import { RoleUser } from '../../models/roleUser.enum';

@Component({
  selector: 'worky-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent implements OnInit { 

  registerForm: FormGroup = new FormGroup({});

  WorkyButtonType = WorkyButtonType;

  WorkyButtonTheme = WorkyButtonTheme;

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

    if (this.registerForm.invalid) return;
    await this._authApiRegisterService.registerUser(this.registerForm.value as RegisterData).subscribe({
      next: () => {
        this._router.navigate(['/auth/login']);
      },
      error: (e) => {
        if (e.error.message === 'E-mail is already in use') {
          console.log('E-mail is already in use');
        }
        if (e.error.message === 'Username is already in use') {
          console.log('Username is already in use');
        }
        console.log(e.error);
      }     
    });
  }
}

