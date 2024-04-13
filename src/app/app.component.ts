import { ChangeDetectionStrategy, Component, Inject, Renderer2 } from '@angular/core';
import { getTranslationsLanguage } from '../translations/translations';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'worky-root',
  templateUrl: 'app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  constructor(@Inject(DOCUMENT) private document: Document, private renderer: Renderer2) {
    document.body.classList.add('light-theme');
    this.renderer.setAttribute(this.document.documentElement, 'lang', getTranslationsLanguage());
  }
}
