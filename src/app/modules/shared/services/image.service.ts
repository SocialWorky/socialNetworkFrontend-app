import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError, timer } from 'rxjs';
import { retryWhen, delayWhen, take, catchError, switchMap, timeout } from 'rxjs/operators';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { LogService, LevelLogEnum } from './core-apis/log.service';
import { environment } from '@env/environment';

export interface ImageLoadOptions {
  maxRetries?: number;
  retryDelay?: number;
  fallbackUrl?: string;
  timeout?: number;
  showSkeleton?: boolean;
  useServiceWorkerCache?: boolean;
  priority?: 'high' | 'medium' | 'low';
}

export interface ImageLoadResult {
  url: string;
  success: boolean;
  error?: string;
  retryCount: number;
  cacheSource?: 'memory' | 'service-worker' | 'network';
}

@Injectable({
  providedIn: 'root'
})
export class ImageService {
  private readonly DEFAULT_OPTIONS: ImageLoadOptions = {
    maxRetries: 3,
    retryDelay: 1000,
    fallbackUrl: '/assets/img/shared/handleImageError.png',
    timeout: 10000,
    showSkeleton: true,
    useServiceWorkerCache: true,
    priority: 'medium'
  };

  private imageCache = new Map<string, string>();
  private loadingImages = new Map<string, BehaviorSubject<boolean>>();
  private useServiceWorkerCache = false;
  private isMobileDevice = false;

  constructor(
    private http: HttpClient,
    private logService: LogService
  ) {
    this.initializeService();
  }

  private initializeService(): void {
    // Detect mobile device
    this.isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Setup Service Worker integration
    this.setupServiceWorkerIntegration();
    
    // Adjust timeouts for mobile
    if (this.isMobileDevice) {
      this.DEFAULT_OPTIONS.timeout = 15000; // Longer timeout for mobile
      this.DEFAULT_OPTIONS.maxRetries = 2; // Fewer retries for mobile
    }
  }

  private setupServiceWorkerIntegration(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        this.useServiceWorkerCache = true;
        this.logService.log(LevelLogEnum.INFO, 'ImageService', 'Service Worker cache enabled');
      }).catch(error => {
        this.logService.log(LevelLogEnum.WARN, 'ImageService', 'Service Worker cache not available', { error: error.message });
      });
    }
  }

  /**
   * Load image with retry logic and fallback handling
   */
  loadImage(imageUrl: string, options: ImageLoadOptions = {}): Observable<string> {
    const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };
    
    // Check memory cache first
    if (this.imageCache.has(imageUrl)) {
      this.logService.log(LevelLogEnum.INFO, 'ImageService', 'Image loaded from memory cache', { url: imageUrl });
      return of(this.imageCache.get(imageUrl)!);
    }

    // Check if already loading
    if (this.loadingImages.has(imageUrl)) {
      return this.loadingImages.get(imageUrl)!.asObservable().pipe(
        switchMap(() => of(this.imageCache.get(imageUrl) || imageUrl))
      );
    }

    const loadingSubject = new BehaviorSubject<boolean>(true);
    this.loadingImages.set(imageUrl, loadingSubject);

    // Try Service Worker cache first if enabled
    if (finalOptions.useServiceWorkerCache && this.useServiceWorkerCache) {
      return this.loadFromServiceWorkerCache(imageUrl, finalOptions);
    }

    // Fallback to direct loading
    return this.loadFromNetwork(imageUrl, finalOptions);
  }

  /**
   * Load image with skeleton support and better error handling
   */
  loadImageWithSkeleton(imageUrl: string, options: ImageLoadOptions = {}): Observable<ImageLoadResult> {
    const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };
    
    return new Observable(observer => {
      let retryCount = 0;
      
      const attemptLoad = () => {
        this.loadImage(imageUrl, finalOptions).subscribe({
          next: (url) => {
            observer.next({
              url,
              success: true,
              retryCount,
              cacheSource: this.getCacheSource(imageUrl)
            });
            observer.complete();
          },
          error: (error) => {
            retryCount++;
            
            if (retryCount <= finalOptions.maxRetries!) {
              this.logService.log(LevelLogEnum.WARN, 'ImageService', 'Retrying image load', {
                url: imageUrl,
                retryCount,
                maxRetries: finalOptions.maxRetries
              });
              
              // Retry after delay
              timer(finalOptions.retryDelay!).subscribe(() => {
                attemptLoad();
              });
            } else {
              this.logService.log(LevelLogEnum.ERROR, 'ImageService', 'Image load failed after all retries', {
                url: imageUrl,
                retryCount,
                error: error.message
              });
              
              observer.next({
                url: finalOptions.fallbackUrl || '',
                success: false,
                error: error.message,
                retryCount
              });
              observer.complete();
            }
          }
        });
      };
      
      attemptLoad();
    });
  }

  /**
   * Load image from Service Worker cache
   */
  private loadFromServiceWorkerCache(imageUrl: string, options: ImageLoadOptions): Observable<string> {
    return new Observable(observer => {
      this.checkServiceWorkerCache(imageUrl).then(cachedUrl => {
        if (cachedUrl) {
          this.imageCache.set(imageUrl, cachedUrl);
          this.loadingImages.get(imageUrl)?.next(false);
          this.loadingImages.delete(imageUrl);
          
          this.logService.log(LevelLogEnum.INFO, 'ImageService', 'Image loaded from Service Worker cache', { 
            url: imageUrl,
            cacheSource: 'service-worker'
          });
          
          observer.next(cachedUrl);
          observer.complete();
        } else {
          // Fallback to network loading
          this.loadFromNetwork(imageUrl, options).subscribe(observer);
        }
      }).catch(() => {
        // Fallback to network loading
        this.loadFromNetwork(imageUrl, options).subscribe(observer);
      });
    });
  }

  /**
   * Check if image exists in Service Worker cache
   */
  private async checkServiceWorkerCache(imageUrl: string): Promise<string | null> {
    if (!this.useServiceWorkerCache) return null;
    
    try {
      const cacheNames = await caches.keys();
      const imageCacheNames = cacheNames.filter(name => 
        name.includes('assets-images') || 
        name.includes('user-images-cache') || 
        name.includes('publication-images-cache') ||
        name.includes('profile-images-cache')
      );
      
      for (const cacheName of imageCacheNames) {
        const cache = await caches.open(cacheName);
        const response = await cache.match(imageUrl);
        if (response) {
          return response.url;
        }
      }
      
      return null;
    } catch (error) {
      this.logService.log(LevelLogEnum.WARN, 'ImageService', 'Service Worker cache check failed', { 
        url: imageUrl, 
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Load image from network
   */
  private loadFromNetwork(imageUrl: string, options: ImageLoadOptions): Observable<string> {
    return of(imageUrl).pipe(
      timeout(options.timeout!),
      switchMap(() => {
        this.imageCache.set(imageUrl, imageUrl);
        this.loadingImages.get(imageUrl)?.next(false);
        this.loadingImages.delete(imageUrl);
        
        this.logService.log(LevelLogEnum.INFO, 'ImageService', 'Image loaded from network', { 
          url: imageUrl,
          cacheSource: 'network'
        });
        
        return of(imageUrl);
      }),
      catchError((error: HttpErrorResponse) => {
        this.logService.log(LevelLogEnum.ERROR, 'ImageService', 'Image load failed', { 
          url: imageUrl, 
          error: error.message,
          status: error.status 
        });
        
        this.loadingImages.get(imageUrl)?.next(false);
        this.loadingImages.delete(imageUrl);
        
        // Return fallback if available
        if (options.fallbackUrl) {
          this.logService.log(LevelLogEnum.INFO, 'ImageService', 'Using fallback image', { 
            original: imageUrl, 
            fallback: options.fallbackUrl 
          });
          return of(options.fallbackUrl);
        }
        
        return throwError(() => error);
      })
    );
  }

  /**
   * Preload image without blocking UI
   */
  preloadImage(imageUrl: string, options: ImageLoadOptions = {}): void {
    const finalOptions = { ...options, priority: 'low' as const };
    
    this.loadImage(imageUrl, finalOptions).subscribe({
      next: () => this.logService.log(LevelLogEnum.INFO, 'ImageService', 'Image preloaded successfully', { url: imageUrl }),
      error: (error) => this.logService.log(LevelLogEnum.ERROR, 'ImageService', 'Image preload failed', { url: imageUrl, error })
    });
  }

  /**
   * Preload multiple images
   */
  preloadImages(imageUrls: string[], options: ImageLoadOptions = {}): void {
    const finalOptions = { ...options, priority: 'low' as const };
    
    imageUrls.forEach(url => {
      this.preloadImage(url, finalOptions);
    });
  }

  /**
   * Check if image URL is valid and accessible
   */
  validateImageUrl(imageUrl: string): Observable<boolean> {
    if (!imageUrl) {
      return of(false);
    }

    return this.http.head(imageUrl, { observe: 'response' }).pipe(
      switchMap(response => {
        const contentType = response.headers.get('content-type');
        return of(contentType?.startsWith('image/') || false);
      }),
      catchError(() => of(false))
    );
  }

  /**
   * Clear image cache
   */
  clearCache(): void {
    this.imageCache.clear();
    this.logService.log(LevelLogEnum.INFO, 'ImageService', 'Image cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { 
    size: number; 
    entries: string[]; 
    isMobile: boolean; 
    serviceWorkerEnabled: boolean;
    cacheHits: number;
    cacheMisses: number;
  } {
    return {
      size: this.imageCache.size,
      entries: Array.from(this.imageCache.keys()),
      isMobile: this.isMobileDevice,
      serviceWorkerEnabled: this.useServiceWorkerCache,
      cacheHits: 0, // TODO: Implement cache hit tracking
      cacheMisses: 0 // TODO: Implement cache miss tracking
    };
  }

  /**
   * Get cache source for an image
   */
  private getCacheSource(imageUrl: string): 'memory' | 'service-worker' | 'network' {
    if (this.imageCache.has(imageUrl)) {
      return 'memory';
    }
    // Note: Service Worker cache detection would require async operation
    return 'network';
  }

  /**
   * Force refresh image from network
   */
  forceRefreshImage(imageUrl: string, options: ImageLoadOptions = {}): Observable<string> {
    // Remove from cache to force network load
    this.imageCache.delete(imageUrl);
    
    const finalOptions = { ...this.DEFAULT_OPTIONS, ...options, useServiceWorkerCache: false };
    return this.loadFromNetwork(imageUrl, finalOptions);
  }
} 