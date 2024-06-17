import { ChangeDetectionStrategy, Component, Inject, OnInit, Renderer2 } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { getTranslationsLanguage } from '../translations/translations';
import { ConfigService } from '@shared/services/config.service';
import { config } from 'dotenv';

@Component({
  selector: 'worky-root',
  templateUrl: 'app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  constructor(
    @Inject(DOCUMENT) private document: Document,
    private _renderer: Renderer2,
    private _configService: ConfigService
  ) {
    this.applyCustomCss();
  }

  ngOnInit(): void {
    this.document.body.classList.add('light-theme');
    this._renderer.setAttribute(
      this.document.documentElement,
      'lang',
      getTranslationsLanguage()
    );
  }

  async applyCustomCss() {
    await this._configService.getConfig().subscribe((configData) => {
    if (configData.customCss) {
      const styleElement = this._renderer.createElement('style');
      styleElement.id = 'custom-css';
      styleElement.innerHTML = String(configData.customCss);
      this._renderer.appendChild(this.document.head, styleElement);
    }
    });
  }
}
