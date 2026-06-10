import { Injectable, NgZone } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { BehaviorSubject, Subject } from 'rxjs';
import { Capacitor } from '@capacitor/core';

import { AlertService } from './alert.service';
import { Alerts, Position } from './../enums/alerts.enum';

export type PwaBannerMode = 'ios' | 'android';

@Injectable({
  providedIn: 'root',
})
export class PwaInstallService {
  private deferredPrompt: any;
  private isInstalled = false;

  private installStatusSubject = new Subject<'installed' | 'dismissed'>();
  installStatus$ = this.installStatusSubject.asObservable();

  // Reactive flag the install banner subscribes to.
  private showBannerSubject = new BehaviorSubject<boolean>(false);
  showBanner$ = this.showBannerSubject.asObservable();

  private readonly DISMISS_KEY = 'pwaInstallBannerDismissedAt';
  private readonly DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  // iOS cannot detect from Safari that the PWA is already installed (isolated
  // storage, no appinstalled event), so the user acknowledges it manually.
  private readonly INSTALLED_ACK_KEY = 'pwaInstallAcknowledged';

  constructor(
    private ngZone: NgZone,
    private alertController: AlertController,
    private _alertService: AlertService,
  ) {
    this.setupInstallPrompt();
    this.setupDisplayModeListener();
    this.checkInitialInstallState();
    this.recomputeBanner();
    // beforeinstallprompt can fire shortly after load on Android — re-evaluate.
    setTimeout(() => this.recomputeBanner(), 1500);
  }

  // ── Platform / standalone detection (web PWA, not Capacitor) ──────────────────

  private get ua(): string {
    return navigator.userAgent || '';
  }

  isIos(): boolean {
    return /iphone|ipad|ipod/i.test(this.ua) ||
      // iPadOS 13+ reports as Mac; disambiguate via touch points.
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  /** iOS add-to-home-screen only exists in Safari (not Chrome/Firefox on iOS). */
  isIosSafari(): boolean {
    return this.isIos() && !/crios|fxios|edgios|opios|brave/i.test(this.ua);
  }

  isAndroid(): boolean {
    return /android/i.test(this.ua);
  }

  /** True when already running as an installed PWA (covers iOS + Android). */
  isStandalone(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      ('standalone' in navigator && (navigator as any).standalone === true);
  }

  // ── Install banner state ──────────────────────────────────────────────────────

  private isBannerDismissed(): boolean {
    // User confirmed it is already installed → never show again.
    if (localStorage.getItem(this.INSTALLED_ACK_KEY) === 'true') return true;

    const raw = localStorage.getItem(this.DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!at || Number.isNaN(at)) return false;
    return (Date.now() - at) < this.DISMISS_TTL_MS;
  }

  /** Banner is shown only when NOT installed, NOT dismissed, and installable. */
  canShowInstallBanner(): boolean {
    if (this.isStandalone()) return false;
    if (this.isBannerDismissed()) return false;
    if (this.isIosSafari()) return true;          // iOS: manual instructions
    return !!this.deferredPrompt;                 // Android/desktop: native prompt ready
  }

  getBannerMode(): PwaBannerMode {
    return this.isIosSafari() ? 'ios' : 'android';
  }

  private recomputeBanner(): void {
    this.showBannerSubject.next(this.canShowInstallBanner());
  }

  /** Hide the banner and remember the dismissal for the TTL window. */
  dismissBanner(): void {
    localStorage.setItem(this.DISMISS_KEY, String(Date.now()));
    this.showBannerSubject.next(false);
  }

  /** User says the app is already installed (iOS escape hatch) — never show again. */
  acknowledgeInstalled(): void {
    localStorage.setItem(this.INSTALLED_ACK_KEY, 'true');
    this.showBannerSubject.next(false);
  }

  /** Trigger the native Android/desktop install prompt from the banner. */
  promptInstallFromBanner(): void {
    this.installPWA();
    this.showBannerSubject.next(false);
  }

  isPwaSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      (window.matchMedia('(display-mode: standalone)').matches ||
       ('standalone' in navigator && (navigator as any).standalone === true))
    );
  }

  isAppInstalled(): boolean {
    return this.isInstalled;
  }

  private setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.ngZone.run(() => {
        this.deferredPrompt = event;
        this.recomputeBanner();
      });
    });

    window.addEventListener('appinstalled', () => {
      this.ngZone.run(() => {
        this.isInstalled = true;
        this.deferredPrompt = null;
        this.installStatusSubject.next('installed');

        localStorage.setItem('isAppInstalled', 'true');
        // Durable flag (not cleared by checkInitialInstallState when browsing in a
        // tab) so the banner stays hidden after install, across reloads — even on
        // localhost where Chrome keeps re-firing beforeinstallprompt.
        localStorage.setItem(this.INSTALLED_ACK_KEY, 'true');
        this.recomputeBanner();
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
        this.recomputeBanner();
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
    if (!this.deferredPrompt || (this.isAppInstalled() && Capacitor.getPlatform() === 'android')) {
      this._alertService.showAlert('App ya Instalada', 'Se detectó que ya cuentas con la App instalada', Alerts.INFO, Position.CENTER, true, 'Aceptar');
      return;
    } else if (Capacitor.getPlatform() === 'ios') {
      this._alertService.showAlert('Instalar App en iOS', 'Para instalar esta aplicación en iOS:\n\n1. Toca el botón de compartir (□↑) en la barra inferior\n2. Selecciona "Agregar a pantalla de inicio"\n3. Toca "Agregar"', Alerts.INFO, Position.CENTER, true, 'Entendido');
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

  canInstallPWA(): boolean {
    return !!this.deferredPrompt && !this.isAppInstalled();
  }

  getInstallationStatus(): { canInstall: boolean; isInstalled: boolean; platform: string } {
    const platform = Capacitor.getPlatform();
    const canInstall = this.canInstallPWA();
    const isInstalled = this.isAppInstalled();
    
    return {
      canInstall,
      isInstalled,
      platform
    };
  }
}
