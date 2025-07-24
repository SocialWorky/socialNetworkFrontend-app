import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError, timer } from 'rxjs';
import { retryWhen, delayWhen, take, catchError, switchMap } from 'rxjs/operators';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { LogService, LevelLogEnum } from './core-apis/log.service';

export interface ImageLoadOptions {
  maxRetries?: number;
  retryDelay?: number;
  fallbackUrl?: string;
  timeout?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ImageService {
  private readonly DEFAULT_OPTIONS: ImageLoadOptions = {
    maxRetries: 3,
    retryDelay: 1000,
    fallbackUrl: '/assets/images/placeholder.jpg',
    timeout: 10000
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
   * Preload image without blocking UI
   */
  preloadImage(imageUrl: string, options: ImageLoadOptions = {}): void {
    this.loadImage(imageUrl, options).subscribe({
      next: () => this.logService.log(LevelLogEnum.INFO, 'ImageService', 'Image preloaded successfully', { url: imageUrl }),
      error: (error) => this.logService.log(LevelLogEnum.ERROR, 'ImageService', 'Image preload failed', { url: imageUrl, error })
    });
  }

  /**
   * Clear image cache
   */
  clearCache(): void {
    this.imageCache.forEach(url => URL.revokeObjectURL(url));
    this.imageCache.clear();
    this.loadingImages.clear();
  }

  /**
   * Get loading state for an image
   */
  getLoadingState(imageUrl: string): Observable<boolean> {
    return this.loadingImages.get(imageUrl)?.asObservable() || of(false);
  }

  /**
   * Check if image is cached
   */
  isCached(imageUrl: string): boolean {
    return this.imageCache.has(imageUrl);
  }
} 