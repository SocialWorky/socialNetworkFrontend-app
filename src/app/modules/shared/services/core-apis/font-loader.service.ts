import { Injectable } from '@angular/core';
import { LogService, LevelLogEnum } from './log.service';

@Injectable({
  providedIn: 'root'
})
export class FontLoaderService {
  private loadedFonts = new Set<string>();

  constructor(private logService: LogService) {}

  /**
   * Carga una fuente de Google Fonts de forma lazy
   */
  loadGoogleFont(fontUrl: string, fontName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.loadedFonts.has(fontName)) {
        resolve();
        return;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = fontUrl;
      link.id = `font-${fontName}`;

      link.onload = () => {
        this.loadedFonts.add(fontName);
        // Fuente cargada - no need to log every font load
        resolve();
      };

      link.onerror = () => {
        this.logService.log(LevelLogEnum.ERROR, 'FontLoaderService', `Error cargando fuente: ${fontName}`);
        reject(new Error(`Error cargando fuente: ${fontName}`));
      };

      document.head.appendChild(link);
    });
  }

  /**
   * Carga Material Icons
   */
  loadMaterialIcons(): Promise<void> {
    return this.loadGoogleFont(
      'https://fonts.googleapis.com/icon?family=Material+Icons&display=swap',
      'material-icons'
    );
  }

  /**
   * Carga Material Symbols Sharp
   */
  loadMaterialSymbolsSharp(): Promise<void> {
    return this.loadGoogleFont(
      'https://fonts.googleapis.com/css2?family=Material+Symbols+Sharp:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap',
      'material-symbols-sharp'
    );
  }

  /**
   * Carga Material Symbols Rounded
   */
  loadMaterialSymbolsRounded(): Promise<void> {
    return this.loadGoogleFont(
      'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap',
      'material-symbols-rounded'
    );
  }

  /**
   * Carga Montserrat
   */
  loadMontserrat(): Promise<void> {
    return this.loadGoogleFont(
      'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap',
      'montserrat'
    );
  }

  /**
   * Carga Open Sans
   */
  loadOpenSans(): Promise<void> {
    return this.loadGoogleFont(
      'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;700&display=swap',
      'open-sans'
    );
  }

  /**
   * Verifica si una fuente ya está cargada
   */
  isFontLoaded(fontName: string): boolean {
    return this.loadedFonts.has(fontName);
  }

  /**
   * Carga múltiples fuentes en paralelo
   */
  loadMultipleFonts(fonts: Array<{ url: string; name: string }>): Promise<void[]> {
    const promises = fonts.map(font => this.loadGoogleFont(font.url, font.name));
    return Promise.all(promises);
  }
} 