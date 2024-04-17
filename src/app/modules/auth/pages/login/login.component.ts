import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { WorkyButtonType, WorkyButtonTheme } from '../../../shared/buttons/models/worky-button-model';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { LoadingController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { AuthApiService } from '../../services/apiLogin.service';
import { LoginData } from '../../interfaces/login.interface';
import { translations } from '../../../../../translations/translations';

@Component({
  selector: 'worky-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit { 
  loginForm: FormGroup = new FormGroup({});

  WorkyButtonType = WorkyButtonType;

  WorkyButtonTheme = WorkyButtonTheme;
  
  messageError:string = "";

  token = localStorage.getItem('token');

  private subscription: Subscription = new Subscription();

  constructor(
    private _authApiService: AuthApiService,
    private _router: Router,
    private _alertController: AlertController,
    private _loadingCtrl: LoadingController,
    private _formBuilder: FormBuilder,
    private _cdr: ChangeDetectorRef) { }

 ngOnInit() {

    this.loginForm = this._formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    if (this.token !== null) {
      this._router.navigate(['/home']);
    }
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
    error: (error: any) => {
      if (error.status === 401) {
        this.mostrarErrorAlert(translations['login.messageErrorCredentials']);
        loading.dismiss();
      }
      if (error.status === 500) {
        this.mostrarErrorAlert(translations['login.messageErrorServer']);
        loading.dismiss();
      }
    },
    complete: () => {
      loading.dismiss();
    }
  });
}


  ngOnDestroy() {
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
