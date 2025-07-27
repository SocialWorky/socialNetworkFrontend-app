import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { LogService, LevelLogEnum } from './core-apis/log.service';

@Injectable({
  providedIn: 'root'
})
export class GoogleImageService {
  private readonly GOOGLE_IMAGE_CACHE = new Map<string, string>();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas
  private readonly REQUEST_TIMEOUT = 5000; // 5 segundos
  private readonly MAX_RETRIES = 2;

  constructor(
    private http: HttpClient,
    private logService: LogService
  ) {}

  /**
   * Obtiene una imagen de Google con manejo de errores y caché
   */
  getGoogleImage(imageUrl: string, size: number = 96): Observable<string> {
    if (!this.isValidGoogleImageUrl(imageUrl)) {
      // Invalid Google image URL - no need to log every invalid URL
      return throwError(() => new Error('Invalid Google image URL'));
    }

    const cacheKey = `${imageUrl}_${size}`;
    const cached = this.GOOGLE_IMAGE_CACHE.get(cacheKey);
    if (cached) {
      return of(cached);
    }

    // Always use fallback due to CORS issues with Google Images
    
    return this.getFallbackImage();
  }

  /**
   * Obtiene imagen de fallback
   */
  private getFallbackImage(): Observable<string> {
    // Return empty string to force initials display
    return of('');
  }

  /**
   * Detecta si estamos en entorno de desarrollo
   */
  private isDevelopmentEnvironment(): boolean {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.port === '4200';
  }

  private shouldUseFallback(): boolean {
    return !navigator.onLine || 
           window.location.protocol === 'file:' ||
           this.hasRecentGoogleImageErrors();
  }

  private hasRecentGoogleImageErrors(): boolean {
    return false;
  }

  /**
   * Valida si la URL es una imagen válida de Google
   */
  private isValidGoogleImageUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    
    // Verificar que sea una URL de Google
    const googleDomains = [
      'lh3.googleusercontent.com',
      'lh4.googleusercontent.com',
      'lh5.googleusercontent.com',
      'lh6.googleusercontent.com'
    ];

    try {
      const urlObj = new URL(url);
      return googleDomains.some(domain => urlObj.hostname.includes(domain));
    } catch {
      return false;
    }
  }

  /**
   * Optimiza la URL de Google para evitar errores 429
   */
  private optimizeGoogleImageUrl(url: string, size: number): string {
    try {
      const urlObj = new URL(url);
      
      urlObj.searchParams.set('sz', size.toString());
      
      if (!urlObj.searchParams.has('s')) {
        urlObj.searchParams.set('s', '96-c');
      }

      return urlObj.toString();
    } catch {
      return url;
    }
  }

  /**
   * Precarga imágenes de Google
   */
  preloadGoogleImages(urls: string[], size: number = 96): void {
    urls.forEach(url => {
      if (this.isValidGoogleImageUrl(url)) {
        this.getGoogleImage(url, size).subscribe();
      }
    });
  }

  /**
   * Limpia el caché de imágenes
   */
  clearCache(): void {
    this.GOOGLE_IMAGE_CACHE.forEach(objectUrl => {
      URL.revokeObjectURL(objectUrl);
    });
    this.GOOGLE_IMAGE_CACHE.clear();
    

  }

  /**
   * Obtiene estadísticas del caché
   */
  getCacheStats(): { size: number; urls: string[] } {
    return {
      size: this.GOOGLE_IMAGE_CACHE.size,
      urls: Array.from(this.GOOGLE_IMAGE_CACHE.keys())
    };
  }
} 