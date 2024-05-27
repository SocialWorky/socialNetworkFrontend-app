import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { defineCustomElements } from '@ionic/pwa-elements/loader';
import { Translations } from './translations/translations';
import { environment } from './environments/environment';
import { ConfigService } from '@shared/services/config.service';

if (!navigator.geolocation) {
  console.error('Geolocation is not available');
  throw new Error('Geolocation not supported in this browser');
}

const translationsInitializer = new Translations();

if (environment.PRODUCTION) {
  enableProdMode();
}

async function initializeApp() {
  try {
    await translationsInitializer.initialize();
    await loadThemeColorsFromLocalStorage();
    platformBrowserDynamic().bootstrapModule(AppModule).catch(err => console.error(err));
    defineCustomElements(window);
  } catch (error) {
    console.error('Error initializing translations:', error);
  }
}

async function loadThemeColorsFromLocalStorage() {
  const appModuleRef = await platformBrowserDynamic().bootstrapModule(AppModule);
  const injector = appModuleRef.injector;
  const _configService = injector.get(ConfigService);

  await _configService.getConfig().subscribe((configData) => {
    localStorage.setItem('theme', configData.settings.themeColors);
    const theme = JSON.parse(configData.settings.themeColors);
    Object.keys(theme).forEach(variable => {
      document.documentElement.style.setProperty(variable, theme[variable]);
    });
  });
}

initializeApp();
