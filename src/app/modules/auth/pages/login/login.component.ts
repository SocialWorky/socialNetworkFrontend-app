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
    private _alertController: AlertController,
    private _loadingCtrl: LoadingController,
    private _formBuilder: FormBuilder,
    private _alertService: AlertService,
    private _cdr: ChangeDetectorRef) { 

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
      this.mostrarErrorAlert(translations['login.emailOrPasswordIncorrect']);
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
          this.mostrarErrorAlert('Email no verificado');
          loading.dismiss();
        }
        if (e.error.message === 'Unauthorized access. Please provide valid credentials to access this resource') {
          this.mostrarErrorAlert(translations['login.messageErrorCredentials']);
          loading.dismiss();
        }
        if (e.status === 500) {
          this.mostrarErrorAlert(translations['login.messageErrorServer']);
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
      message: 'Validando correo...',
    });
    await loading.present();

    this.subscription = this._authApiService.validarCorreoConToken(token).subscribe({
      next: (response: any) => {
        if (response && response.message) {
          this._alertService.showAlert(
            'Correo validado',
            'Ya puedes iniciar sesión, tu correo ha sido validado correctamente',
             Alerts.SUCCESS,
             Position.CENTER,
             true,
             true,
             'Aceptar',
          );
        }
      },
      error: (e: any) => {
        console.log(e.error.text);
        this.mostrarErrorAlert('Error validando correo');
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

  async mostrarErrorAlert(mensaje: string) {
    const alert = await this._alertController.create({
      header: translations['login.messageErrorHeader'],
      message: mensaje,
      buttons: [translations['button.ok']]
    });

    await alert.present();
  }

}
