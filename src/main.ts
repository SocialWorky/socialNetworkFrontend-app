import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { defineCustomElements } from '@ionic/pwa-elements/loader';
import { Translations } from './translations/translations';
import { environment } from './environments/environment';
import { ConfigService } from '@shared/services/core-apis/config.service';
import { Subject, takeUntil } from 'rxjs';

const destroy$ = new Subject<void>();

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

async function loadThemeColorsFromLocalStorage(): Promise<void> {
  const appModuleRef = await platformBrowserDynamic().bootstrapModule(AppModule);
  const injector = appModuleRef.injector;
  const _configService = injector.get(ConfigService);

  await _configService.getConfig().pipe(takeUntil(destroy$)).subscribe((configData) => {
    localStorage.setItem('theme', configData.settings.themeColors);
    const theme = JSON.parse(configData.settings.themeColors);
    Object.keys(theme).forEach(variable => {
      document.documentElement.style.setProperty(variable, theme[variable]);
    });

    if (configData.settings.title) {
      document.title = configData.settings.title;
    }

    if (configData.settings.logoUrl) {
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        const imgElement = document.createElement('img');
        imgElement.src = configData.settings.logoUrl;
        imgElement.alt = 'Cargando...';
        loadingScreen.innerHTML = '';
        loadingScreen.appendChild(imgElement);
      }
    }

    updateMetaTags(configData);

    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.style.opacity = '0';
      setTimeout(() => loadingScreen.remove(), 500);
    }
  });
}

function updateMetaTags(configData: any) {
  if (configData.settings.title) {
    document.title = configData.settings.title;
  }

  updateMetaTag('property', 'og:site_name', configData.settings.title);
  updateMetaTag('property', 'og:url', configData.settings.urlSite);
  updateMetaTag('property', 'og:description', configData.settings.description);
  updateMetaTag('property', 'og:image', configData.settings.logoUrl);

  updateFavicon(configData.settings.logoUrl);
}

function updateMetaTag(attrName: string, attrValue: string, content: string) {
  let element: HTMLMetaElement | null = document.querySelector(`meta[${attrName}="${attrValue}"]`);
  
  if (element) {
    element.setAttribute('content', content);
  } else {
    element = document.createElement('meta');
    element.setAttribute(attrName, attrValue);
    element.setAttribute('content', content);
    document.head.appendChild(element);
  }
}

function updateFavicon(iconUrl: string) {
  const link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
  if (link) {
    link.href = iconUrl;
  } else {
    const newLink = document.createElement('link');
    newLink.rel = 'icon';
    newLink.href = iconUrl;
    document.head.appendChild(newLink);
  }
}

initializeApp();
