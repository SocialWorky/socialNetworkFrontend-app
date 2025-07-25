import { Injectable } from '@angular/core';
import { LogService, LevelLogEnum } from './log.service';

@Injectable({
  providedIn: 'root'
})
export class LazyCssService {
  private loadedStyles = new Set<string>();

  constructor(private logService: LogService) {}

  /**
   * Carga CSS de forma lazy
   * @param cssPath - Ruta del archivo CSS
   * @param id - Identificador único para evitar cargas duplicadas
   */
  loadCss(cssPath: string, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.loadedStyles.has(id)) {
        resolve();
        return;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = cssPath;
      link.id = `lazy-css-${id}`;

      link.onload = () => {
        this.loadedStyles.add(id);
        this.logService.log(LevelLogEnum.INFO, 'LazyCssService', `CSS cargado exitosamente: ${cssPath}`);
        resolve();
      };

      link.onerror = () => {
        this.logService.log(LevelLogEnum.ERROR, 'LazyCssService', `Error cargando CSS: ${cssPath}`);
        reject(new Error(`Error cargando CSS: ${cssPath}`));
      };

      document.head.appendChild(link);
    });
  }

  /**
   * Carga highlight.js CSS cuando se necesite
   */
  loadHighlightJs(): Promise<void> {
    return this.loadCss('assets/highlight-js/atom-one-dark.css', 'highlight-js');
  }

  /**
   * Carga Material Icons CSS
   */
  loadMaterialIcons(): Promise<void> {
    return this.loadCss('https://fonts.googleapis.com/icon?family=Material+Icons&display=swap', 'material-icons');
  }

  /**
   * Carga Material Symbols CSS
   */
  loadMaterialSymbols(): Promise<void> {
    return this.loadCss('https://fonts.googleapis.com/css2?family=Material+Symbols+Sharp:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap', 'material-symbols-sharp');
  }

  /**
   * Carga Cropper.js CSS
   */
  loadCropperCss(): Promise<void> {
    return this.loadCss('assets/cropper/cropper.css', 'cropper');
  }

  /**
   * Carga Driver.js CSS
   */
  loadDriverCss(): Promise<void> {
    return this.loadCss('assets/driver/driver.css', 'driver');
  }

  /**
   * Carga Emoji Mart CSS
   */
  loadEmojiMartCss(): Promise<void> {
    return this.loadCss('assets/emoji-mart/picker.css', 'emoji-mart');
  }

  /**
   * Verifica si un CSS ya está cargado
   */
  isLoaded(id: string): boolean {
    return this.loadedStyles.has(id);
  }

  /**
   * Remueve CSS cargado (útil para limpieza)
   */
  removeCss(id: string): void {
    const link = document.getElementById(`lazy-css-${id}`);
    if (link) {
      link.remove();
      this.loadedStyles.delete(id);
    }
  }
} 