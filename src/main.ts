import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { defineCustomElements } from '@ionic/pwa-elements/loader';
import { Translations } from './translations/translations';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

const translationsInitializer = new Translations();

async function initializeApp() {
  try {
    await translationsInitializer.initialize();
    platformBrowserDynamic().bootstrapModule(AppModule).catch(err => console.error(err));
    defineCustomElements(window);
  } catch (error) {
    console.error('Error initializing translations:', error);
  }
}

initializeApp();