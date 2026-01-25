import { enableProdMode } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { defineCustomElements } from '@ionic/pwa-elements/loader';

import { AppModule } from './app/app.module';
import { Translations } from './translations/translations';
import { environment } from './environments/environment';
import { ConfigService } from '@shared/services/core-apis/config.service';

/**
 * Normalize image URL for MinIO paths (standalone function for use before Angular is initialized)
 */
function normalizeImageUrl(url: string, baseUrl: string): string {
  if (!url) return '';
  
  // If URL already starts with blob/data/http/https, return as is
  if (url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If it's an asset path, return as is
  if (url.startsWith('assets/')) {
    return url;
  }
  
  // Handle URLs that start with /profileImg/, /publications/, etc. (remove leading slash)
  if (url.startsWith('/profileImg/') || url.startsWith('/publications/') || 
      url.startsWith('/config/') || url.startsWith('/uploads/')) {
    url = url.slice(1);
  }
  
  // If no baseUrl, return empty string for known MinIO paths to prevent 404
  if (!baseUrl || baseUrl.trim() === '') {
    const knownMinIOPatterns = ['profileImg/', 'publications/', 'uploads/', 'config/', 'users/', 'comments/'];
    const isKnownMinIOPath = knownMinIOPatterns.some(pattern => url.startsWith(pattern));
    if (isKnownMinIOPath) {
      console.error('[main.ts] MINIO_BUCKET_URL is not configured. Cannot normalize URL:', url);
      return ''; // Return empty string to prevent 404
    }
    return url;
  }
  
  // Clean base URL (remove trailing slash)
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  // Clean the URL - remove leading slash if present
  const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
  
  // Construct final URL
  return `${cleanBaseUrl}/${cleanUrl}`;
}

const destroy$ = new Subject<void>();

if (!navigator.geolocation) {
  throw new Error('Geolocation not supported in this browser');
}

const translationsInitializer = new Translations();

if (environment.PRODUCTION) {
  enableProdMode();
}

async function initializeApp() {
  try {
    await translationsInitializer.initialize();

    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
      const theme = JSON.parse(storedTheme);
      Object.keys(theme).forEach(variable => {
        document.documentElement.style.setProperty(variable, theme[variable]);
      });
    }

    const body = document.body;
    if (localStorage.getItem('isDarkMode') === 'true') {
      body.classList.add('dark-mode');
    } else {
      body.classList.remove('dark-mode');
    }

    const appModuleRef = await platformBrowserDynamic().bootstrapModule(AppModule);
    defineCustomElements(window);

    const injector = appModuleRef.injector;
    const _configService = injector.get(ConfigService);

    const configTimeout = setTimeout(() => {
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => loadingScreen.remove(), 500);
      }
    }, 3000);

    _configService.getConfig().pipe(takeUntil(destroy$)).subscribe({
      next: (configData) => {
        clearTimeout(configTimeout);
        
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
            // Normalize logo URL before setting src
            const normalizedLogoUrl = normalizeImageUrl(configData.settings.logoUrl, environment.MINIO_BUCKET_URL || '');
            if (normalizedLogoUrl) {
              imgElement.src = normalizedLogoUrl;
            }
            imgElement.alt = 'Loading...';
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
      },
      error: (error) => {
        clearTimeout(configTimeout);
        
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
          loadingScreen.style.opacity = '0';
          setTimeout(() => loadingScreen.remove(), 500);
        }
      }
    });
  } catch (error) {
    // Application initialization error
  }
}

function updateMetaTags(configData: any) {
  if (configData.settings.title) {
    document.title = configData.settings.title;
  }
  updateMetaTag('property', 'og:site_name', configData.settings.title);
  updateMetaTag('property', 'og:url', configData.settings.urlSite);
  updateMetaTag('property', 'og:description', configData.settings.description);
  // Normalize logo URL before using for og:image
  const normalizedLogoUrl = normalizeImageUrl(configData.settings.logoUrl || '', environment.MINIO_BUCKET_URL || '');
  if (normalizedLogoUrl) {
    updateMetaTag('property', 'og:image', normalizedLogoUrl);
  }
  // Normalize logo URL before using for favicon
  const normalizedFaviconUrl = normalizeImageUrl(configData.settings.logoUrl || '', environment.MINIO_BUCKET_URL || '');
  if (normalizedFaviconUrl) {
    updateFavicon(normalizedFaviconUrl);
  }
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

