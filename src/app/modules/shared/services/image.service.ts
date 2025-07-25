import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError, timer } from 'rxjs';
import { retryWhen, delayWhen, take, catchError, switchMap, timeout } from 'rxjs/operators';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { LogService, LevelLogEnum } from './core-apis/log.service';

export interface ImageLoadOptions {
  maxRetries?: number;
  retryDelay?: number;
  fallbackUrl?: string;
  timeout?: number;
  showSkeleton?: boolean;
}

export interface ImageLoadResult {
  url: string;
  success: boolean;
  error?: string;
  retryCount: number;
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
    showSkeleton: true
  };

  private imageCache = new Map<string, string>();
  private loadingImages = new Map<string, BehaviorSubject<boolean>>();

  constructor(
    private http: HttpClient,
    private logService: LogService
  ) {}

  /**
   * Load image with retry logic and fallback handling
   */
  loadImage(imageUrl: string, options: ImageLoadOptions = {}): Observable<string> {
    const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };
    
    // Check cache first
    if (this.imageCache.has(imageUrl)) {
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

    // For images, we'll use the original URL directly with retry logic
    return of(imageUrl).pipe(
      timeout(finalOptions.timeout!),
      switchMap(() => {
        this.imageCache.set(imageUrl, imageUrl);
        loadingSubject.next(false);
        this.loadingImages.delete(imageUrl);
        return of(imageUrl);
      }),
      catchError((error: HttpErrorResponse) => {
        this.logService.log(LevelLogEnum.ERROR, 'ImageService', 'Image load failed', { 
          url: imageUrl, 
          error: error.message,
          status: error.status 
        });
        
        loadingSubject.next(false);
        this.loadingImages.delete(imageUrl);
        
        // Return fallback if available
        if (finalOptions.fallbackUrl) {
          this.logService.log(LevelLogEnum.INFO, 'ImageService', 'Using fallback image', { 
            original: imageUrl, 
            fallback: finalOptions.fallbackUrl 
          });
          return of(finalOptions.fallbackUrl);
        }
        
        return throwError(() => error);
      })
    );
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
              retryCount
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
   * Preload image without blocking UI
   */
  preloadImage(imageUrl: string, options: ImageLoadOptions = {}): void {
    this.loadImage(imageUrl, options).subscribe({
      next: () => this.logService.log(LevelLogEnum.INFO, 'ImageService', 'Image preloaded successfully', { url: imageUrl }),
      error: (error) => this.logService.log(LevelLogEnum.ERROR, 'ImageService', 'Image preload failed', { url: imageUrl, error })
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
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.imageCache.size,
      entries: Array.from(this.imageCache.keys())
    };
  }
} 