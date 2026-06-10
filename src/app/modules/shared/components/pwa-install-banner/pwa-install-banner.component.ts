import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

import { PwaInstallService, PwaBannerMode } from '@shared/services/pwa-install.service';
import { environment } from '@env/environment';

@Component({
  selector: 'worky-pwa-install-banner',
  templateUrl: './pwa-install-banner.component.html',
  styleUrls: ['./pwa-install-banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class PwaInstallBannerComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  show = false;
  mode: PwaBannerMode = 'android';

  // Brand name + logo from environment variables (multi-tenant), with a static fallback.
  private readonly fallbackLogo = 'assets/icons/icon-Worky-96x96.png';
  appName: string = environment.PWA_NAME || 'Worky';
  logoUrl: string = environment.TEMPLATE_EMAIL_LOGO || this.fallbackLogo;

  constructor(
    private readonly _pwaInstallService: PwaInstallService,
    private readonly _cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this._pwaInstallService.showBanner$
      .pipe(takeUntil(this.destroy$))
      .subscribe((show) => {
        this.show = show;
        if (show) {
          this.mode = this._pwaInstallService.getBannerMode();
        }
        this._cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  install(): void {
    this._pwaInstallService.promptInstallFromBanner();
  }

  dismiss(): void {
    this._pwaInstallService.dismissBanner();
  }

  markInstalled(): void {
    this._pwaInstallService.acknowledgeInstalled();
  }

  onLogoError(): void {
    if (this.logoUrl !== this.fallbackLogo) {
      this.logoUrl = this.fallbackLogo;
      this._cdr.markForCheck();
    }
  }
}
