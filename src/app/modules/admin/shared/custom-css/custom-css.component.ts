import { ChangeDetectorRef, Component } from '@angular/core';
import { ConfigService } from '@shared/services/config.service';

@Component({
  selector: 'worky-custom-css',
  templateUrl: './custom-css.component.html',
  styleUrls: ['./custom-css.component.scss'],
})
export class CustomCssComponent  {

  customCss: string = '';

  constructor( private _configService: ConfigService, private _cdr: ChangeDetectorRef ) {
    this.loadCustomCss();
  }

  async saveCustomCss() {
    await this._configService.updateConfig({ customCss: this.customCss }).subscribe();
    this.applyCustomCss();
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
