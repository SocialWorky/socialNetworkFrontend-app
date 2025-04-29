import { Injectable, NgZone } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { Capacitor } from '@capacitor/core';

import { AlertService } from './alert.service';
import { Alerts, Position } from './../enums/alerts.enum';

@Injectable({
  providedIn: 'root',
})
export class PwaInstallService {
  private deferredPrompt: any;
  private isInstalled = false;

  private installStatusSubject = new Subject<'installed' | 'dismissed'>();
  installStatus$ = this.installStatusSubject.asObservable();

  constructor(
    private ngZone: NgZone,
    private alertController: AlertController,
    private _alertService: AlertService,
  ) {
    this.setupInstallPrompt();
    this.setupDisplayModeListener();
    this.checkInitialInstallState();
  }

  isPwaSupported(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && (navigator as any).standalone === true)
    );
  }

  isAppInstalled(): boolean {
    return this.isInstalled;
  }

  private setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferredPrompt = event;
    });

    window.addEventListener('appinstalled', () => {
      this.ngZone.run(() => {
        this.isInstalled = true;
        this.deferredPrompt = null;
        this.installStatusSubject.next('installed');

        localStorage.setItem('isAppInstalled', 'true');
      });
    });
  }

  private setupDisplayModeListener() {
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handler = (event: MediaQueryListEvent) => {
      this.ngZone.run(() => {
        this.isInstalled = event.matches;
        if (event.matches) {
          this.installStatusSubject.next('installed');
        } else {
          this.installStatusSubject.next('dismissed');
        }
      });
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      mediaQuery.addListener(handler);
    }
  }

  private checkInitialInstallState() {
    const isAppPreviouslyInstalled = localStorage.getItem('isAppInstalled') === 'true';
    const isCurrentlyStandalone = window.matchMedia('(display-mode: standalone)').matches;

    if (isAppPreviouslyInstalled && !isCurrentlyStandalone) {
      this.isInstalled = false;
      localStorage.removeItem('isAppInstalled');
    } else if (isCurrentlyStandalone) {
      this.isInstalled = true;
    } else {
      this.isInstalled = false;
    }
  }

  async showInstallPrompt(header: string, message: string) {
    if (!this.deferredPrompt || this.isAppInstalled() && Capacitor.getPlatform() === 'android') {
      this._alertService.showAlert('App ya Instalada', 'Se detecto que ya cuentas con la App instalada', Alerts.INFO, Position.CENTER, true, 'Aceptar');
      return;
    } else if (Capacitor.getPlatform() === 'ios') {
      this._alertService.showAlert('Instalar App en IOS', 'Para instalar esta aplicación en iOS, toca el botón de compartir en la barra inferior y selecciona "Agregar a pantalla de inicio".', Alerts.INFO, Position.CENTER, true, 'Aceptar');
      return;
    }

    const alert = await this.alertController.create({
      header,
      message,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          handler: () => {
            this.installStatusSubject.next('dismissed');
          },
        },
        {
          text: 'Instalar',
          handler: () => {
            this.installPWA();
          },
        },
      ],
    });

    await alert.present();
  }

  installPWA() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      this.deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          this.installStatusSubject.next('installed');
        } else {
          this.installStatusSubject.next('dismissed');
        }
        this.deferredPrompt = null;
      });
    }
  }
}
