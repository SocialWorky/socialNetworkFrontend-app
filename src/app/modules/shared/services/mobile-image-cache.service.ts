import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, from, throwError } from 'rxjs';
import { catchError, map, switchMap, tap, timeout, retryWhen, delay } from 'rxjs/operators';
import { LogService, LevelLogEnum } from './core-apis/log.service';
import { ImageService, ImageLoadOptions } from './image.service';
import { HttpClient } from '@angular/common/http';
import { ConnectionQualityService } from './connection-quality.service';
import { DeviceDetectionService } from './device-detection.service';
import { AuthService } from '../../auth/services/auth.service';
import { EnhancedLoggingService } from './enhanced-logging.service';

// iOS-specific optimizations
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
              (navigator.userAgent.includes('Safari') && navigator.userAgent.includes('Mac') && 'ontouchend' in document);

const iOS_CONFIG: MobileCacheConfig = {
  maxCacheSize: 50 * 1024 * 1024, // 50MB for iOS (more conservative)
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (shorter for iOS)
  preloadThreshold: 2, // Less aggressive preloading
  compressionEnabled: true, // Always enable compression for iOS
  offlineMode: false,
  persistentCache: true,
  imageTypes: {
    profile: { maxAge: 3 * 24 * 60 * 60 * 1000, priority: 'high' as const }, // 3 days
    publication: { maxAge: 7 * 24 * 60 * 60 * 1000, priority: 'medium' as const }, // 7 days
    media: { maxAge: 3 * 24 * 60 * 60 * 1000, priority: 'low' as const } // 3 days
  }
};

export interface MobileCacheConfig {
  maxCacheSize: number;
  maxAge: number;
  preloadThreshold: number;
  compressionEnabled: boolean;
  offlineMode: boolean;
  persistentCache: boolean;
  imageTypes: {
    profile: { maxAge: number; priority: 'high' | 'medium' | 'low' };
    publication: { maxAge: number; priority: 'high' | 'medium' | 'low' };
    media: { maxAge: number; priority: 'high' | 'medium' | 'low' };
  };
}

export interface CacheMetrics {
  totalImages: number;
  cacheSize: number;
  hitRate: number;
  missRate: number;
  averageLoadTime: number;
  mobileOptimized: boolean;
  persistentCacheSize: number;
}

export interface CachedImage {
  url: string;
  blob: Blob;
  type: 'profile' | 'publication' | 'media';
  size: number;
  timestamp: number;
  lastAccessed: number;
  accessCount: number;
  expiresAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class MobileImageCacheService {
  private readonly MOBILE_CONFIG: MobileCacheConfig = {
    maxCacheSize: 100 * 1024 * 1024, // 100MB for mobile
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    preloadThreshold: 3,
    compressionEnabled: true,
    offlineMode: false,
    persistentCache: true,
    imageTypes: {
      profile: { maxAge: 7 * 24 * 60 * 60 * 1000, priority: 'high' }, // 7 days for profile images
      publication: { maxAge: 14 * 24 * 60 * 60 * 1000, priority: 'medium' }, // 14 days for publication images
      media: { maxAge: 7 * 24 * 60 * 60 * 1000, priority: 'low' } // 7 days for media
    }
  };

  private readonly DESKTOP_CONFIG: MobileCacheConfig = {
    maxCacheSize: 200 * 1024 * 1024, // 200MB for desktop
    maxAge: 60 * 24 * 60 * 60 * 1000, // 60 days
    preloadThreshold: 5,
    compressionEnabled: false,
    offlineMode: false,
    persistentCache: true,
    imageTypes: {
      profile: { maxAge: 14 * 24 * 60 * 60 * 1000, priority: 'high' },
      publication: { maxAge: 30 * 24 * 60 * 60 * 1000, priority: 'medium' },
      media: { maxAge: 14 * 24 * 60 * 60 * 1000, priority: 'low' }
    }
  };

  private isMobileDevice = false;
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'MobileImageCacheDB';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'images';
  
  private cacheMetrics = new BehaviorSubject<CacheMetrics>({
    totalImages: 0,
    cacheSize: 0,
    hitRate: 0,
    missRate: 0,
    averageLoadTime: 0,
    mobileOptimized: false,
    persistentCacheSize: 0
  });

  private cacheHits = 0;
  private cacheMisses = 0;
  private loadTimes: number[] = [];
  private memoryCache = new Map<string, CachedImage>();
  private cacheSize = 0; // Track total cache size in bytes

  constructor(
    private imageService: ImageService,
    private logService: LogService,
    private http: HttpClient,
    private connectionQualityService: ConnectionQualityService,
    private deviceDetectionService: DeviceDetectionService,
    private authService: AuthService,
    private enhancedLoggingService: EnhancedLoggingService
  ) {
    this.initializeService();
  }

  private initializeService(): void {
    this.isMobileDevice = this.detectMobileDevice();
    
    // Initialize IndexedDB
    this.initializeDatabase().then(() => {
      // Service initialized successfully - no need to log this
    }).catch(error => {
      this.enhancedLoggingService.logWithEnhancedMetadata(
        LevelLogEnum.ERROR,
        'MobileImageCacheService',
        'Failed to initialize service',
        { error: error?.message || error?.toString() }
      );
    });
  }

  private detectMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  private getCurrentConfig(): MobileCacheConfig {
    if (isIOS) {
      return iOS_CONFIG;
    } else if (this.isMobileDevice) {
      return this.MOBILE_CONFIG;
    } else {
      return this.DESKTOP_CONFIG;
    }
  }

  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.openDatabase(resolve, reject);
    });
  }

  private openDatabase(resolve: () => void, reject: (error: any) => void): void {
    const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

    request.onerror = (event) => {
      const error = (event.target as IDBOpenDBRequest).error;
      this.logService.log(LevelLogEnum.ERROR, 'MobileImageCacheService', 'IndexedDB open error', { error: error?.message });
      
      // For iOS Safari, don't fail completely, just use memory cache
      if (isIOS) {
        this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'iOS IndexedDB failed, falling back to memory cache');
        resolve();
      } else {
        reject(error);
      }
    };

    request.onsuccess = () => {
      this.db = request.result;

      resolve();
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(this.STORE_NAME)) {
        try {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'url' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
          store.createIndex('expiresAt', 'expiresAt', { unique: false });

        } catch (error) {
          this.logService.log(LevelLogEnum.ERROR, 'MobileImageCacheService', 'Error creating object store', { error });
          if (isIOS) {
            // For iOS, don't fail completely
            resolve();
          } else {
            reject(error);
          }
        }
      }
    };
  }

  /**
   * Get enhanced device and user information for logging
   */
  private getEnhancedLogMetadata(imageUrl: string, imageType: string, options: ImageLoadOptions = {}): Record<string, any> {
    const connectionInfo = this.connectionQualityService.getConnectionInfo();
    const userInfo = this.authService.getDecodedToken();
    const deviceInfo = this.getDeviceInfo();
    
    return {
      url: imageUrl,
      imageType,
      isIOS,
      isMobile: this.isMobileDevice,
      connectionQuality: connectionInfo.quality,
      connectionType: connectionInfo.effectiveType,
      downlink: connectionInfo.downlink,
      rtt: connectionInfo.rtt,
      saveData: connectionInfo.saveData,
      userId: userInfo?.id || 'anonymous',
      userEmail: userInfo?.email || 'anonymous',
      userRole: userInfo?.role || 'user',
      deviceInfo,
      timeout: options.timeout,
      priority: options.priority,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      onLine: navigator.onLine,
      cookieEnabled: navigator.cookieEnabled,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: (navigator as any).deviceMemory,
      maxTouchPoints: navigator.maxTouchPoints
    };
  }

  /**
   * Get detailed device information
   */
  private getDeviceInfo(): Record<string, any> {
    const isTablet = this.deviceDetectionService.isTablet();
    const isNative = this.deviceDetectionService.isNative();
    const isIphone = this.deviceDetectionService.isIphone();
    
    return {
      isTablet,
      isNative,
      isIphone,
      width: this.deviceDetectionService.width(),
      height: this.deviceDetectionService.height(),
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      pixelRatio: window.devicePixelRatio,
      colorDepth: window.screen.colorDepth,
      orientation: window.screen.orientation?.type || 'unknown'
    };
  }

  /**
   * Get optimized timeout based on connection quality and device type
   */
  private getOptimizedTimeout(options: ImageLoadOptions = {}): number {
    const connectionInfo = this.connectionQualityService.getConnectionInfo();
    const baseTimeout = options.timeout || 30000;
    
    // Adjust timeout based on connection quality
    switch (connectionInfo.quality) {
      case 'slow':
        return Math.max(baseTimeout * 2, 60000); // At least 60 seconds for slow connections
      case 'medium':
        return Math.max(baseTimeout * 1.5, 45000); // At least 45 seconds for medium connections
      case 'fast':
      default:
        return baseTimeout;
    }
  }

  /**
   * Get retry configuration based on connection quality
   */
  private getRetryConfig(): { maxRetries: number; retryDelay: number } {
    const connectionInfo = this.connectionQualityService.getConnectionInfo();
    
    switch (connectionInfo.quality) {
      case 'slow':
        return { maxRetries: 3, retryDelay: 5000 }; // More retries, longer delays for slow connections
      case 'medium':
        return { maxRetries: 2, retryDelay: 3000 };
      case 'fast':
      default:
        return { maxRetries: 1, retryDelay: 1000 };
    }
  }

  /**
   * Load image with mobile optimizations and persistent cache
   */
  loadImage(imageUrl: string, imageType: 'profile' | 'publication' | 'media' = 'media', options: ImageLoadOptions = {}): Observable<string> {
    const startTime = performance.now();
    const config = this.getCurrentConfig();
    const optimizedTimeout = this.getOptimizedTimeout(options);
    const retryConfig = this.getRetryConfig();
    
    // iOS-specific timeout adjustment
    const timeoutValue = isIOS ? Math.min(optimizedTimeout, 15000) : optimizedTimeout;
    
    // Handle Google Images with special service
    if (this.isGoogleImage(imageUrl)) {
      return this.handleGoogleImage(imageUrl, imageType, options);
    }
    
    // iOS-specific URL validation
    if (isIOS && !imageUrl.startsWith('http')) {
      this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'Invalid image URL for iOS', { url: imageUrl });
      return throwError(() => new Error('Invalid image URL'));
    }
    
    // Check memory cache first
    if (this.memoryCache.has(imageUrl)) {
      const cached = this.memoryCache.get(imageUrl)!;
      if (this.isCacheValid(cached)) {
        this.updateAccessMetrics(cached);
        this.cacheHits++;
        this.updateMetrics();
        // Image loaded from memory cache - no need to log every cache hit
        return of(URL.createObjectURL(cached.blob));
      } else {
        this.memoryCache.delete(imageUrl);
      }
    }

    // For Safari iOS, skip persistent cache entirely
    if (isIOS) {
      // Safari iOS: loading from network only - no need to log every network request
      return this.loadFromNetwork(imageUrl, imageType, { ...options, timeout: timeoutValue }).pipe(
        tap(cachedImage => {
          if (cachedImage) {
            // Store in memory cache only for iOS
            this.memoryCache.set(imageUrl, cachedImage);
            this.cacheMisses++;
            this.updateMetrics();
          }
        }),
        map(cachedImage => URL.createObjectURL(cachedImage.blob)),
        catchError(error => {
          this.cacheMisses++;
          this.updateMetrics();
          this.enhancedLoggingService.logImageError(
            'MobileImageCacheService',
            'Error loading image on iOS',
            imageUrl,
            imageType,
            error,
            performance.now() - startTime,
            options
          );
          return throwError(() => error);
        })
      );
    }

    // For non-iOS browsers, use persistent cache
    return from(this.getFromPersistentCache(imageUrl)).pipe(
      switchMap(cachedImage => {
        if (cachedImage && this.isCacheValid(cachedImage)) {
          // Store in memory cache
          if (this.memoryCache.size < 15) {
            this.memoryCache.set(imageUrl, cachedImage);
          }
          this.updateAccessMetrics(cachedImage);
          this.cacheHits++;
          this.updateMetrics();
          // Image loaded from persistent cache - no need to log every cache hit
          return of(URL.createObjectURL(cachedImage.blob));
        }

        // Load from network and cache with retry logic
        return this.loadFromNetwork(imageUrl, imageType, { ...options, timeout: timeoutValue }).pipe(
          retryWhen(errors => 
            errors.pipe(
              switchMap((error, index) => {
                if (index >= retryConfig.maxRetries) {
                  return throwError(() => error);
                }
                return of(error).pipe(delay(retryConfig.retryDelay));
              })
            )
          ),
          tap(cachedImage => {
            if (cachedImage) {
              // Store in memory cache
              if (this.memoryCache.size < 15) {
                this.memoryCache.set(imageUrl, cachedImage);
              }
              this.cacheMisses++;
              this.updateMetrics();
            }
          }),
          map(cachedImage => URL.createObjectURL(cachedImage.blob))
        );
      }),
      catchError(error => {
        this.cacheMisses++;
        this.updateMetrics();
        this.enhancedLoggingService.logImageError(
          'MobileImageCacheService',
          'Failed to load image from network',
          imageUrl,
          imageType,
          error,
          performance.now() - startTime,
          options
        );
        return throwError(() => error);
      })
    );
  }

  private async getFromPersistentCache(imageUrl: string): Promise<CachedImage | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.get(imageUrl);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => {
          // iOS Safari specific error handling
          if (isIOS) {
            this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'iOS IndexedDB read failed, falling back to network', { url: imageUrl });
            resolve(null); // Don't fail completely, fall back to network
          } else {
            reject(request.error);
          }
        };
      } catch (error) {
        // iOS Safari sometimes throws errors during IndexedDB operations
        if (isIOS) {
          this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'iOS IndexedDB operation failed, falling back to network', { error, url: imageUrl });
          resolve(null); // Don't fail completely, fall back to network
        } else {
          reject(error);
        }
      }
    });
  }

  private loadFromNetwork(imageUrl: string, imageType: 'profile' | 'publication' | 'media', options: ImageLoadOptions): Observable<CachedImage> {
    const startTime = performance.now();
    
    // Validate URL for iOS Safari
    if (isIOS) {
      if (!imageUrl || !imageUrl.startsWith('http')) {
        this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'Invalid image URL for iOS', { url: imageUrl });
        return throwError(() => new Error('Invalid image URL for iOS Safari'));
      }
    }

    return this.http.get(imageUrl, { 
      responseType: 'blob',
      headers: {
        'Cache-Control': 'max-age=3600' // 1 hour cache
      }
    }).pipe(
      timeout(options.timeout || 30000),
      map(blob => {
        // Validate downloaded blob
        if (!blob || blob.size === 0) {
          throw new Error('Invalid blob received from network');
        }

        // For iOS Safari, validate blob type
        if (isIOS && !blob.type.startsWith('image/')) {
          this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'Invalid blob type for iOS', { 
            url: imageUrl, 
            type: blob.type 
          });
          throw new Error('Invalid image type for iOS Safari');
        }

        const config = this.getCurrentConfig();
        const imageTypeConfig = config.imageTypes[imageType];
        
        const cachedImage: CachedImage = {
          url: imageUrl,
          blob: blob,
          type: imageType,
          size: blob.size,
          timestamp: Date.now(),
          lastAccessed: Date.now(),
          accessCount: 1,
          expiresAt: Date.now() + imageTypeConfig.maxAge
        };

        // Check cache size and cleanup if needed
        if (this.cacheSize + blob.size > config.maxCacheSize) {
          this.cleanupOldCache();
        }

        this.cacheSize += blob.size;

        // Store in persistent cache asynchronously (don't wait for it) - ONLY for non-iOS
        if (!isIOS && this.db && config.persistentCache) {
          this.storeInPersistentCache(cachedImage).catch(error => {
            this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'Failed to store in persistent cache', { error });
          });
        }

        const loadTime = performance.now() - startTime;
        this.loadTimes.push(loadTime);
        this.updateMetrics();

        // Image loaded from network and cached - no need to log every successful load

        return cachedImage;
      }),
      catchError(error => {
        const loadTime = performance.now() - startTime;
        
        // Don't log as ERROR for Google Images since they have known CORS issues
        if (this.isGoogleImage(imageUrl)) {
          // No need to log every Google Image CORS error - this is expected behavior
        } else {
                  this.enhancedLoggingService.logImageError(
          'MobileImageCacheService',
          'Failed to load image from network',
          imageUrl,
          imageType,
          error,
          loadTime,
          options
        );
        }
        return throwError(() => error);
      })
    );
  }

  private async storeInPersistentCache(cachedImage: CachedImage): Promise<void> {
    // Early return for iOS Safari - completely avoid IndexedDB operations
    if (isIOS) {
      this.logService.log(LevelLogEnum.DEBUG, 'MobileImageCacheService', 'Skipping persistent cache for iOS Safari', { url: cachedImage.url });
      return;
    }

    if (!this.db) return;

    return new Promise((resolve, reject) => {
      try {
        // Validate blob before storing
        if (!cachedImage.blob || cachedImage.blob.size === 0) {
          this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'Invalid blob, skipping persistent cache', { url: cachedImage.url });
          resolve();
          return;
        }

        // Additional validation for blob type
        if (!cachedImage.blob.type.startsWith('image/')) {
          this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'Invalid blob type, skipping persistent cache', { 
            url: cachedImage.url, 
            type: cachedImage.blob.type 
          });
          resolve();
          return;
        }

        const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        
        // Create a clean object for storage (avoid circular references)
        const storageObject = {
          url: cachedImage.url,
          type: cachedImage.type,
          size: cachedImage.size,
          timestamp: cachedImage.timestamp,
          lastAccessed: cachedImage.lastAccessed,
          accessCount: cachedImage.accessCount,
          expiresAt: cachedImage.expiresAt,
          blob: cachedImage.blob
        };

        const request = store.put(storageObject);

        request.onsuccess = () => {
          // Image stored in persistent cache - no need to log every storage operation
          resolve();
        };

        request.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          
          // Check for specific Safari iOS IndexedDB errors
          const isBlobError = error?.message?.includes('Blob') || 
                             error?.message?.includes('File') || 
                             error?.message?.includes('object store') ||
                             error?.message?.includes('preparing');
          
          if (isBlobError) {
            this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'Blob storage error detected, using memory cache only', { 
              url: cachedImage.url, 
              error: error?.message,
              errorName: error?.name
            });
            resolve(); // Don't fail completely, just use memory cache
            return;
          }

          this.logService.log(LevelLogEnum.ERROR, 'MobileImageCacheService', 'Error storing in persistent cache', { 
            url: cachedImage.url, 
            error: error?.message,
            errorName: error?.name
          });

          // Handle quota exceeded errors
          if (error?.name === 'QuotaExceededError') {
            this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'Storage quota exceeded, cleaning up cache');
            this.cleanupOldCache().then(() => {
              // Retry after cleanup
              const retryRequest = store.put(storageObject);
              retryRequest.onsuccess = () => resolve();
              retryRequest.onerror = () => {
                this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'Retry failed, using memory cache only');
                resolve(); // Don't fail completely
              };
            }).catch(() => {
              this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'Cleanup failed, using memory cache only');
              resolve(); // Don't fail completely
            });
          } else {
            // For other errors, just resolve to avoid breaking the app
            this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'IndexedDB error, using memory cache only', { error: error?.message });
            resolve(); // Don't fail completely
          }
        };

        transaction.onerror = (event) => {
          const error = (event.target as IDBTransaction).error;
          
          // Check for specific Safari iOS transaction errors
          const isBlobError = error?.message?.includes('Blob') || 
                             error?.message?.includes('File') || 
                             error?.message?.includes('object store') ||
                             error?.message?.includes('preparing');
          
          if (isBlobError) {
            this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'Blob transaction error detected, using memory cache only', { 
              url: cachedImage.url, 
              error: error?.message,
              errorName: error?.name
            });
            resolve(); // Don't fail completely, just use memory cache
            return;
          }

          this.logService.log(LevelLogEnum.ERROR, 'MobileImageCacheService', 'Transaction error', { 
            url: cachedImage.url,
            error: error?.message,
            errorName: error?.name
          });
          
          // For all transaction errors, just resolve to avoid breaking the app
          this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'Transaction error, using memory cache only');
          resolve(); // Don't fail completely
        };

      } catch (error: any) {
        // Check for specific Safari iOS IndexedDB errors
        const errorMessage = error?.message || error?.toString() || '';
        const isBlobError = errorMessage.includes('Blob') || 
                           errorMessage.includes('File') || 
                           errorMessage.includes('object store') ||
                           errorMessage.includes('preparing') ||
                           errorMessage.includes('IndexedDB');
        
        if (isBlobError) {
          this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'Blob/IndexedDB operation failed, falling back to memory cache', { 
            url: cachedImage.url,
            error: errorMessage,
            errorType: typeof error
          });
          resolve(); // Don't fail completely, just use memory cache
        } else {
          this.logService.log(LevelLogEnum.ERROR, 'MobileImageCacheService', 'Unexpected error in persistent cache operation', { 
            url: cachedImage.url,
            error: errorMessage,
            errorType: typeof error
          });
          resolve(); // Don't fail completely, just use memory cache
        }
      }
    });
  }

  private isCacheValid(cachedImage: CachedImage): boolean {
    return Date.now() < cachedImage.expiresAt;
  }

  private isGoogleImage(url: string): boolean {
    return url.includes('lh3.googleusercontent.com') || 
           url.includes('lh4.googleusercontent.com') || 
           url.includes('lh5.googleusercontent.com') || 
           url.includes('lh6.googleusercontent.com');
  }

  private handleGoogleImage(imageUrl: string, imageType: 'profile' | 'publication' | 'media', options: ImageLoadOptions): Observable<string> {
    // For Google Images, we need to handle CORS issues
    // Return a fallback or use a proxy approach
    // No need to log every Google Image detection - this is expected behavior
    
    // Return default avatar image
    return of('/assets/img/shared/handleImageError.png');
  }

  private updateAccessMetrics(cachedImage: CachedImage): void {
    cachedImage.lastAccessed = Date.now();
    cachedImage.accessCount++;
    
    // Update in persistent cache - ONLY for non-iOS browsers
    if (!isIOS && this.db) {
      this.storeInPersistentCache(cachedImage).catch(error => {
        this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'Failed to update access metrics in persistent cache', { error });
      });
    }
  }

  /**
   * Preload images for better mobile experience
   */
  preloadImages(imageUrls: string[], imageType: 'profile' | 'publication' | 'media' = 'media', priority: 'high' | 'medium' | 'low' = 'medium'): void {
    const config = this.getCurrentConfig();
    const urlsToPreload = imageUrls.slice(0, config.preloadThreshold);
    
    // Preloading images - no need to log every preload operation

    urlsToPreload.forEach(url => {
      this.loadImage(url, imageType, { priority }).subscribe({
        next: () => {
          // Image preloaded - no need to log every preload
        },
        error: (error) => this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'Image preload failed', { url, error })
      });
    });
  }

  /**
   * Get cache metrics
   */
  getCacheMetrics(): Observable<CacheMetrics> {
    return this.cacheMetrics.asObservable();
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    this.memoryCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.loadTimes = [];
    
    if (this.db) {
      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      await store.clear();
    }
    
    await this.updateMetrics();
    // Cache cleared - no need to log every cache clear
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    const stats = await this.getPersistentCacheStats();
    const config = this.getCurrentConfig();
    
    return {
      ...stats,
      mobileOptimized: this.isMobileDevice,
      config,
      metrics: this.cacheMetrics.value
    };
  }

  private async getPersistentCacheStats(): Promise<any> {
    if (!this.db) return { size: 0, items: 0 };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result as CachedImage[];
        const totalSize = items.reduce((sum, item) => sum + item.size, 0);
        resolve({
          size: totalSize,
          items: items.length,
          byType: {
            profile: items.filter(item => item.type === 'profile').length,
            publication: items.filter(item => item.type === 'publication').length,
            media: items.filter(item => item.type === 'media').length
          }
        });
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Optimize cache for mobile
   */
  async optimizeForMobile(): Promise<void> {
    if (!this.isMobileDevice) return;
    
    // Cleanup old cache entries
    await this.cleanupOldCache();
    
    // Compress cached images if enabled
    if (this.getCurrentConfig().compressionEnabled) {
      await this.compressCachedImages();
    }
    
    // Mobile optimization completed - no need to log every optimization
  }

  /**
   * Start cache monitoring
   */
  private startCacheMonitoring(): void {
    // Monitor cache size every 5 minutes
    setInterval(() => {
      this.monitorCacheSize();
    }, 5 * 60 * 1000);
  }

  /**
   * Monitor cache size
   */
  private async monitorCacheSize(): Promise<void> {
    const stats = await this.getPersistentCacheStats();
    const config = this.getCurrentConfig();
    
    if (stats.size > config.maxCacheSize) {
      this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'Cache size limit reached', {
        currentSize: stats.size,
        maxSize: config.maxCacheSize
      });
      
      // Trigger cleanup
      await this.cleanupOldCache();
    }
  }

  /**
   * Cleanup old cache entries
   */
  private async cleanupOldCache(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);
    const index = store.index('expiresAt');
    
    const request = index.openCursor();
    
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        const cachedImage = cursor.value as CachedImage;
        if (Date.now() > cachedImage.expiresAt) {
          cursor.delete();
        }
        cursor.continue();
      }
    };

    // Cache cleanup completed - no need to log every cleanup
  }

  /**
   * Compress cached images
   */
  private async compressCachedImages(): Promise<void> {
    // This would be implemented based on your image compression strategy
    // Image compression triggered - no need to log every compression
  }

  /**
   * Track load time
   */
  private trackLoadTime(loadTime: number): void {
    this.loadTimes.push(loadTime);
    
    // Keep only last 100 measurements
    if (this.loadTimes.length > 100) {
      this.loadTimes.shift();
    }
  }

  /**
   * Update metrics
   */
  private async updateMetrics(): Promise<void> {
    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate = totalRequests > 0 ? this.cacheHits / totalRequests : 0;
    const missRate = totalRequests > 0 ? this.cacheMisses / totalRequests : 0;
    const averageLoadTime = this.loadTimes.length > 0 
      ? this.loadTimes.reduce((a, b) => a + b, 0) / this.loadTimes.length 
      : 0;

    const stats = await this.getPersistentCacheStats();
    
    this.cacheMetrics.next({
      totalImages: stats.items,
      cacheSize: stats.size,
      hitRate,
      missRate,
      averageLoadTime,
      mobileOptimized: this.isMobileDevice,
      persistentCacheSize: stats.size
    });
  }

  /**
   * Check if device is mobile
   */
  isMobile(): boolean {
    return this.isMobileDevice;
  }

  /**
   * Get current configuration
   */
  getConfig(): MobileCacheConfig {
    return this.getCurrentConfig();
  }

  /**
   * Force cache optimization
   */
  async forceOptimization(): Promise<void> {
    await this.optimizeForMobile();
    // Forced optimization completed - no need to log every optimization
  }

  /**
   * iOS-specific cache health check
   */
  async checkIOSCacheHealth(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    if (!isIOS) {
      return { healthy: true, issues: [] };
    }
    
    // Check IndexedDB availability
    if (!('indexedDB' in window)) {
      issues.push('IndexedDB not available');
    }
    
    // Check memory usage
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      if (memory && memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
        issues.push('High memory usage detected');
      }
    }
    
    // Check cache size
    const stats = await this.getPersistentCacheStats();
    const config = this.getCurrentConfig();
    if (stats.size > config.maxCacheSize * 0.9) {
      issues.push('Cache size approaching limit');
    }
    
    // Check memory cache size
    if (this.memoryCache.size > 20) {
      issues.push('Memory cache size too large');
    }
    
    const healthy = issues.length === 0;
    
    // iOS cache health check completed - no need to log every health check
    
    return { healthy, issues };
  }

  /**
   * iOS-specific cache recovery
   */
  async recoverIOSCache(): Promise<void> {
    if (!isIOS) return;
    
    // Starting iOS cache recovery - no need to log every recovery
    
    // Clear memory cache
    this.memoryCache.clear();
    
    // Cleanup persistent cache
    await this.cleanupOldCache();
    
    // Reinitialize database if needed
    if (!this.db) {
              await this.initializeDatabase();
    }
    
    // iOS cache recovery completed - no need to log every recovery
  }
}
