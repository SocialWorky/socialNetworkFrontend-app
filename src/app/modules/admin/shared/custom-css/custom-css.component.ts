import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { ConfigService } from '@shared/services/config.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'worky-custom-css',
  templateUrl: './custom-css.component.html',
  styleUrls: ['./custom-css.component.scss'],
})
export class CustomCssComponent implements OnDestroy {

  customCss: string = '';

  customCssLoader: boolean = false;

  private destroy$ = new Subject<void>();

  constructor( private _configService: ConfigService, private _cdr: ChangeDetectorRef ) {
    this.loadCustomCss();
  }

  async saveCustomCss() {
    this.customCssLoader = true;
    await this._configService.updateConfig({ customCss: this.customCss }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.customCssLoader = false;
        this._cdr.markForCheck();
      },
      error: () => {
        this.customCssLoader = false;
        this._cdr.markForCheck();
      },
    });
    this.applyCustomCss();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadCustomCss() {
    await this._configService.getConfig().subscribe((configData) => {
      if (configData.customCss) {
        this.customCss = String(configData.customCss);
        this._cdr.markForCheck();
        this.applyCustomCss();
      }
    });
  }

  applyCustomCss() {
    let styleElement = document.getElementById('custom-css') as HTMLStyleElement;
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'custom-css';
      document.head.appendChild(styleElement);
    }
    styleElement.innerHTML = this.customCss;
  }

}
