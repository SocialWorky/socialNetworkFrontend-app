import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { DOCUMENT } from '@angular/common'
import { Title } from '@angular/platform-browser';
import { Subject, takeUntil } from 'rxjs';
;
import { getTranslationsLanguage } from '../translations/translations';
import { ConfigService } from '@shared/services/config.service';
import { NotificationUsersService } from '@shared/services/notifications/notificationUsers.service';

@Component({
  selector: 'worky-root',
  templateUrl: 'app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private _renderer: Renderer2,
    private _configService: ConfigService,
    private _titleService: Title,
    private _cdr: ChangeDetectorRef,
    private _notificationUsersService: NotificationUsersService
  ) {
    this._notificationUsersService.setupInactivityListeners();
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

    this._cdr.markForCheck();
  }

  updateFavicon(logoUrl: string) {
    const link: HTMLLinkElement = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/png';
    link.rel = 'icon';
    link.href = logoUrl;
    document.getElementsByTagName('head')[0].appendChild(link);
  }
}
