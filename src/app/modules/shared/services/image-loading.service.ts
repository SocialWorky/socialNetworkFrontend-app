import { Injectable } from '@angular/core';
import { Observable, of, throwError, from } from 'rxjs';
import { catchError, map, switchMap, timeout, retryWhen, delay } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { LogService, LevelLogEnum } from './core-apis/log.service';
import { ImageService, ImageLoadOptions } from './image.service';
import { ConnectionQualityService } from './connection-quality.service';
import { DeviceDetectionService } from './device-detection.service';

// iOS-specific optimizations
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
              (navigator.userAgent.includes('Safari') && navigator.userAgent.includes('Mac') && 'ontouchend' in document);

export interface ImageLoadResult {
  url: string;
  blob: Blob;
  type: 'profile' | 'publication' | 'media';
  size: number;
  loadTime: number;
  fromCache: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ImageLoadingService {
  private readonly DEFAULT_TIMEOUT = 15000; // 15 seconds
  private readonly IOS_TIMEOUT = 10000; // 10 seconds for iOS
  private readonly RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  constructor(
    private http: HttpClient,
    private logService: LogService,
    private imageService: ImageService,
    private connectionQualityService: ConnectionQualityService,
    private deviceDetectionService: DeviceDetectionService
  ) {}

  /**
   * Load image with intelligent timeout and retry logic
   */
  loadImage(
    imageUrl: string, 
    imageType: 'profile' | 'publication' | 'media' = 'media', 
    options: ImageLoadOptions = {}
  ): Observable<ImageLoadResult> {
    const startTime = performance.now();
    const timeoutValue = this.getOptimizedTimeout(options);
    const retryConfig = this.getRetryConfig();

    // Handle Google Images with special service
    if (this.isGoogleImage(imageUrl)) {
      return this.handleGoogleImage(imageUrl, imageType, options);
    }

    // iOS-specific URL validation
    if (isIOS && !imageUrl.startsWith('http')) {
      this.logService.log(LevelLogEnum.WARN, 'ImageLoadingService', 'Invalid image URL for iOS', { url: imageUrl });
      return throwError(() => new Error('Invalid image URL'));
    }

    return this.loadFromNetwork(imageUrl, imageType, options).pipe(
      timeout(timeoutValue),
      retryWhen(errors => 
        errors.pipe(
          delay(retryConfig.retryDelay),
          map((error, index) => {
            if (index >= retryConfig.maxRetries) {
              throw error;
            }
            return error;
          })
        )
      ),
      map(result => {
        const loadTime = performance.now() - startTime;
        this.trackLoadTime(loadTime);
        
        return {
          url: imageUrl,
          blob: result.blob,
          type: imageType,
          size: result.size,
          loadTime,
          fromCache: false
        };
      }),
      catchError(error => {
        this.logService.log(LevelLogEnum.ERROR, 'ImageLoadingService', 'Image loading failed', {
          url: imageUrl,
          type: imageType,
          error: error.message
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Load image from network
   */
  private loadFromNetwork(
    imageUrl: string, 
    imageType: 'profile' | 'publication' | 'media', 
    options: ImageLoadOptions
  ): Observable<{ blob: Blob; size: number }> {
    return this.http.get(imageUrl, { responseType: 'blob' }).pipe(
      map(blob => {
        const size = blob.size;

        return { blob, size };
      }),
      catchError(error => {
        this.logService.log(LevelLogEnum.ERROR, 'ImageLoadingService', 'Network loading failed', {
          url: imageUrl,
          type: imageType,
          error: error.message
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Handle Google Images with special service
   */
  private handleGoogleImage(
    imageUrl: string, 
    imageType: 'profile' | 'publication' | 'media', 
    options: ImageLoadOptions
  ): Observable<ImageLoadResult> {
    return this.imageService.loadImage(imageUrl, options).pipe(
      map(url => {
        // Convert URL to blob for consistency
        return this.http.get(url, { responseType: 'blob' }).pipe(
          map(blob => ({
            url: imageUrl,
            blob,
            type: imageType,
            size: blob.size,
            loadTime: 0,
            fromCache: false
          }))
        );
      }),
      switchMap(observable => observable)
    );
  }

  /**
   * Check if image is from Google
   */
  private isGoogleImage(url: string): boolean {
    return url.includes('googleusercontent.com') || 
           url.includes('google.com') || 
           url.includes('gstatic.com');
  }

  /**
   * Get optimized timeout based on device and connection
   */
  private getOptimizedTimeout(options: ImageLoadOptions = {}): number {
    const connectionInfo = this.connectionQualityService.getConnectionInfo();
    const isSlowConnection = connectionInfo.effectiveType === 'slow-2g' || connectionInfo.effectiveType === '2g';
    
    let timeout = options.timeout || this.DEFAULT_TIMEOUT;
    
    // iOS-specific timeout adjustment
    if (isIOS) {
      timeout = Math.min(timeout, this.IOS_TIMEOUT);
    }
    
    // Slow connection adjustment
    if (isSlowConnection) {
      timeout = Math.min(timeout, 30000); // 30 seconds for slow connections
    }
    
    return timeout;
  }

  /**
   * Get retry configuration
   */
  private getRetryConfig(): { maxRetries: number; retryDelay: number } {
    const connectionInfo = this.connectionQualityService.getConnectionInfo();
    const isSlowConnection = connectionInfo.effectiveType === 'slow-2g' || connectionInfo.effectiveType === '2g';
    
    return {
      maxRetries: isSlowConnection ? 1 : this.RETRY_ATTEMPTS,
      retryDelay: isSlowConnection ? 2000 : this.RETRY_DELAY
    };
  }

  /**
   * Track load time for metrics
   */
  private trackLoadTime(loadTime: number): void {
    // This would be implemented to track performance metrics

  }
} 