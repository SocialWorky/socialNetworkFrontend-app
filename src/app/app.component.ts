import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { DOCUMENT } from '@angular/common'
import { Title } from '@angular/platform-browser';
import { AlertController } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';

import { getTranslationsLanguage } from '../translations/translations';
import { ConfigService } from '@shared/services/core-apis/config.service';
import { NotificationUsersService } from '@shared/services/notifications/notificationUsers.service';

@Component({
  selector: 'worky-root',
  templateUrl: 'app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit, OnDestroy {

  deferredPrompt: any;

  showInstallPrompt = false;

  private destroy$ = new Subject<void>();

  private isPromptHandled = false;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private _renderer: Renderer2,
    private _configService: ConfigService,
    private _titleService: Title,
    private _cdr: ChangeDetectorRef,
    private _notificationUsersService: NotificationUsersService,
    private alertController: AlertController
  ) {
    this._notificationUsersService.setupInactivityListeners();
    this.setupInstallPrompt();
  }

  ngOnInit(): void {
    this.document.body.classList.add('light-theme');
    this._renderer.setAttribute(
      this.document.documentElement,
      'lang',
      getTranslationsLanguage()
    );
    this.applyCustomConfig();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (event) => {
      if (this.isPromptHandled) return;
      event.preventDefault();
      this.deferredPrompt = event;
      this.showInstallAlert();
      this.isPromptHandled = true;
    });
  }

  async showInstallAlert() {
    if (this.showInstallPrompt) return;
    this.showInstallPrompt = true;

    const alert = await this.alertController.create({
      header: 'Instalar Aplicación',
      message: '¿Deseas instalar esta aplicación en tu dispositivo?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          handler: () => {
            this.showInstallPrompt = false;
          },
        },
        {
          text: 'Instalar',
          handler: () => {
            this.installPWA();
            this.showInstallPrompt = false;
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
        if (choiceResult.outcome === 'accepted') {}
        this.deferredPrompt = null;
      });
    }
  }

  applyCustomConfig() {
    this._configService.config$.pipe(takeUntil(this.destroy$)).subscribe((configData) => {
      if (configData) {
        this.applyConfig(configData);
      }
    });

    this._configService.getConfig().pipe(takeUntil(this.destroy$)).subscribe((configData) => {
      this.applyConfig(configData);
    });
  }

  applyConfig(configData: any) {
    if (configData.customCss) {
      const styleElement = this._renderer.createElement('style');
      styleElement.id = 'custom-css';
      styleElement.innerHTML = String(configData.customCss);
      this._renderer.appendChild(this.document.head, styleElement);
    }

    const title = configData.settings.title || 'Social Network App';
    this._titleService.setTitle(title);

    const logoUrl = configData.settings.logoUrl || 'assets/img/navbar/worky-your-logo.png';
    this.updateFavicon(logoUrl);
  }

  updateFavicon(logoUrl: string) {
    const link: HTMLLinkElement =
      document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/png';
    link.rel = 'icon';
    link.href = logoUrl;
    document.getElementsByTagName('head')[0].appendChild(link);
  }
}
