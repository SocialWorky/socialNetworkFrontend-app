import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { WorkyButtonType, WorkyButtonTheme } from '../../../shared/buttons/models/worky-button-model';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { LoadingController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertService } from '../../../shared/services/alert.service';

import { AuthApiService } from '../../services/apiLogin.service';
import { LoginData } from '../../interfaces/login.interface';
import { translations } from '../../../../../translations/translations';
import { Alerts, Position } from '../../../shared/enums/alerts.enum';

@Component({
  selector: 'worky-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit, OnDestroy { 
  loginForm: FormGroup = new FormGroup({});

  WorkyButtonType = WorkyButtonType;

  WorkyButtonTheme = WorkyButtonTheme;
  
  messageError:string = "";

  token = localStorage.getItem('token');

  private subscription: Subscription = new Subscription();

  constructor(
    private _authApiService: AuthApiService,
    private _router: Router,
    private _activatedRoute: ActivatedRoute,
    private _loadingCtrl: LoadingController,
    private _formBuilder: FormBuilder,
    private _alertService: AlertService,
    private _cdr: ChangeDetectorRef
  ) { 

    if (this.token) {
      this._router.navigate(['/home']);
    }
   }

 ngOnInit() {

    this._activatedRoute.paramMap.subscribe(params => {
      const token = params.get('token');
      if (token) {
        this.validarCorreoConToken(token);
      }
    });

    this.loginForm = this._formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this._cdr.detectChanges();
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

  async validarCorreoConToken(token: string) {
    const loading = await this._loadingCtrl.create({
      message: translations['login.messageValidationEmailLoading'],
    });
    await loading.present();

    this.subscription = this._authApiService.validarCorreoConToken(token).subscribe({
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


  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
