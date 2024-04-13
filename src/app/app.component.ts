import { ChangeDetectionStrategy, Component, Inject, Renderer2 } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: [],
})
export class AppComponent {
  constructor(@Inject(DOCUMENT) private document: Document, private renderer: Renderer2) {
    document.body.classList.add('light-theme');
    //this.renderer.setAttribute(this.document.documentElement, 'lang', getTranslationsLanguage());
  }
}
