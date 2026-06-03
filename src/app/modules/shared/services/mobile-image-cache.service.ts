import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, from, throwError, firstValueFrom } from 'rxjs';
import { catchError, map, switchMap, tap, timeout } from 'rxjs/operators';
import { LogService, LevelLogEnum } from './core-apis/log.service';
import { ImageService, ImageLoadOptions } from './image.service';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ConnectionQualityService } from './connection-quality.service';
import { DeviceDetectionService } from './device-detection.service';
import { EnhancedLoggingService } from './enhanced-logging.service';
import { UtilityService } from './utility.service';
import { environment } from '@env/environment';

// iOS-specific optimizations
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
              (navigator.userAgent.includes('Safari') && navigator.userAgent.includes('Mac') && 'ontouchend' in document);

const iOS_CONFIG: MobileCacheConfig = {
  maxCacheSize: 10 * 1024 * 1024, // 10MB for iOS (very conservative)
  maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day (very short for iOS)
  preloadThreshold: 0, // No preloading for iOS
  compressionEnabled: true, // Always enable compression for iOS
  offlineMode: false,
  persistentCache: false, // Disable persistent cache for iOS
  maxMemoryCacheSize: 3, // Very limited memory cache
  maxConcurrentLoads: 1, // Only one load at a time
  imageTypes: {
    profile: { maxAge: 12 * 60 * 60 * 1000, priority: 'high' as const }, // 12 hours
    publication: { maxAge: 1 * 24 * 60 * 60 * 1000, priority: 'medium' as const }, // 1 day
    media: { maxAge: 6 * 60 * 60 * 1000, priority: 'low' as const } // 6 hours
  }
};

export interface MobileCacheConfig {
  maxCacheSize: number;
  maxAge: number;
  preloadThreshold: number;
  compressionEnabled: boolean;
  offlineMode: boolean;
  persistentCache: boolean;
  maxMemoryCacheSize: number;
  maxConcurrentLoads: number; // NEW: Limit concurrent loads
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
    maxCacheSize: 20 * 1024 * 1024, // 20MB for mobile (very conservative)
    maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days (reduced from 7)
    preloadThreshold: 1, // Minimal preloading
    compressionEnabled: true,
    offlineMode: false,
    persistentCache: true,
    maxMemoryCacheSize: 5, // Very limited memory cache
    maxConcurrentLoads: 2, // Only 2 loads at a time
    imageTypes: {
      profile: { maxAge: 1 * 24 * 60 * 60 * 1000, priority: 'high' }, // 1 day
      publication: { maxAge: 3 * 24 * 60 * 60 * 1000, priority: 'medium' }, // 3 days
      media: { maxAge: 1 * 24 * 60 * 60 * 1000, priority: 'low' } // 1 day
    }
  };

  private readonly DESKTOP_CONFIG: MobileCacheConfig = {
    maxCacheSize: 50 * 1024 * 1024, // 50MB for desktop (reduced from 100MB)
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (reduced from 14)
    preloadThreshold: 2, // Minimal preloading
    compressionEnabled: false,
    offlineMode: false,
    persistentCache: true,
    maxMemoryCacheSize: 8, // Limited memory cache
    maxConcurrentLoads: 3, // Only 3 loads at a time
    imageTypes: {
      profile: { maxAge: 3 * 24 * 60 * 60 * 1000, priority: 'high' }, // 3 days
      publication: { maxAge: 7 * 24 * 60 * 60 * 1000, priority: 'medium' }, // 7 days
      media: { maxAge: 3 * 24 * 60 * 60 * 1000, priority: 'low' } // 3 days
    }
  };

  private isMobileDevice = false;
  private db: IDBDatabase | null = null;
  private readonly DB_BASE_NAME = 'MobileImageCacheDB';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'images';
  private currentUserId: string | null = null;
  
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
  private cacheSize = 0;
  
  // Track created object URLs to prevent memory leaks
  private createdObjectUrls = new Set<string>();
  private maxObjectUrls = 100; // High enough to cover a full feed page without premature revocation
  
  // NEW: Load control to prevent infinite loading
  private currentLoads = 0;
  private loadQueue: Array<{ url: string; resolve: (url: string) => void; reject: (error: any) => void; options?: ImageLoadOptions }> = [];
  private isProcessingQueue = false;

  constructor(
    private imageService: ImageService,
    private logService: LogService,
    private http: HttpClient,
    private connectionQualityService: ConnectionQualityService,
    private deviceDetectionService: DeviceDetectionService,
    private enhancedLoggingService: EnhancedLoggingService,
    private _utilityService: UtilityService
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
    
    // NEW: Start automatic cleanup every 2 minutes (reduced from 5)
    this.startAutomaticCleanup();
  }

  private detectMobileDevice(): boolean {
    return this.deviceDetectionService.isMobile();
  }

  private getCurrentConfig(): MobileCacheConfig {
    if (isIOS) {
      return iOS_CONFIG;
    }
    return this.isMobileDevice ? this.MOBILE_CONFIG : this.DESKTOP_CONFIG;
  }

  /**
   * Get database name with user ID
   */
  private getDatabaseName(): string {
    // Get user ID from localStorage to avoid circular dependency
    const token = localStorage.getItem('token');
    if (token && token !== 'undefined' && token !== 'null') {
      try {
        const decodedToken = JSON.parse(atob(token.split('.')[1]));
        const userId = decodedToken.id;
        return userId ? `${this.DB_BASE_NAME}_${userId}` : this.DB_BASE_NAME;
      } catch (error) {
        return this.DB_BASE_NAME;
      }
    }
    return this.DB_BASE_NAME;
  }

  /**
   * Get decoded token from localStorage (to avoid circular dependency)
   */
  private getDecodedTokenFromLocalStorage(): any {
    const token = localStorage.getItem('token');
    if (token && token !== 'undefined' && token !== 'null') {
      try {
        const decodedToken = JSON.parse(atob(token.split('.')[1]));
        return decodedToken;
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  /**
   * Check if user has changed and close current database
   */
  private checkUserChange(): void {
    // Get user ID from localStorage to avoid circular dependency
    const token = localStorage.getItem('token');
    let userId = null;
    
    if (token && token !== 'undefined' && token !== 'null') {
      try {
        const decodedToken = JSON.parse(atob(token.split('.')[1]));
        userId = decodedToken.id;
      } catch (error) {
        userId = null;
      }
    }
    
    if (userId !== this.currentUserId) {
      this.currentUserId = userId;
      this.db = null; // Force re-initialization
      
      // NEW: Clean up object URLs when user changes
      this.cleanupObjectUrls();
    }
  }

  /**
   * Initialize database (public method for DatabaseManagerService)
   */
  async initDatabase(): Promise<void> {
    return this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    this.checkUserChange();
    
    return new Promise((resolve, reject) => {
      this.openDatabase(resolve, reject);
    });
  }

  private openDatabase(resolve: () => void, reject: (error: any) => void): void {
    const request = indexedDB.open(this.getDatabaseName(), this.DB_VERSION);

    request.onerror = (event) => {
      const error = (event.target as IDBOpenDBRequest).error;
      this.logService.log(LevelLogEnum.ERROR, 'MobileImageCacheService', 'IndexedDB open error', { error: error?.message });

      if (isIOS) {
        resolve();
      } else {
        reject(error);
      }
    };

    request.onblocked = () => {
      this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'IndexedDB open blocked by another connection, resolving without db');
      resolve();
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
   * NEW: Start automatic cleanup every 2 minutes (reduced from 5)
   */
  private startAutomaticCleanup(): void {
    setInterval(() => {
      this.cleanupObjectUrls();
      this.cleanupOldCache();
    }, 2 * 60 * 1000); // 2 minutes
  }

  /**
   * NEW: Clean up object URLs to prevent memory leaks
   */
  private cleanupObjectUrls(): void {
    if (this.createdObjectUrls.size > this.maxObjectUrls) {
      const urlsToRemove = Array.from(this.createdObjectUrls).slice(0, this.createdObjectUrls.size - this.maxObjectUrls);

      urlsToRemove.forEach(url => {
        this.createdObjectUrls.delete(url);
        // Grace period: components still rendering this URL get time to unmount before revocation
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      });
    }
  }

  /**
   * NEW: Create object URL with tracking
   */
  private createObjectURL(blob: Blob): string {
    const url = URL.createObjectURL(blob);
    this.createdObjectUrls.add(url);
    
    // Clean up if we have too many
    if (this.createdObjectUrls.size > this.maxObjectUrls) {
      this.cleanupObjectUrls();
    }
    
    return url;
  }

  /**
   * NEW: Load control to prevent infinite loading
   */
  private async processLoadQueue(): Promise<void> {
    if (this.isProcessingQueue || this.loadQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    const config = this.getCurrentConfig();

    while (this.loadQueue.length > 0 && this.currentLoads < config.maxConcurrentLoads) {
      const item = this.loadQueue.shift();
      if (item) {
        this.currentLoads++;
        
        try {
          // Pass options if available in queue item
          const url = await this.loadImageInternal(item.url, item.options || {});
          item.resolve(url);
        } catch (error) {
          item.reject(error);
        } finally {
          this.currentLoads--;
        }
      }
    }

    this.isProcessingQueue = false;
    
    // Process remaining items if any
    if (this.loadQueue.length > 0) {
      setTimeout(() => this.processLoadQueue(), 100);
    }
  }

  /**
   * NEW: Internal load method with strict limits
   * Note: URL should already be normalized when passed to this method
   */
  private async loadImageInternal(imageUrl: string, options: ImageLoadOptions & { imageType?: 'profile' | 'publication' | 'media' } = {}): Promise<string> {
    // Ensure URL is normalized (should already be normalized, but double-check)
    const normalizedUrl = this._utilityService.normalizeImageUrl(imageUrl, environment.MINIO_BUCKET_URL || '');
    const config = this.getCurrentConfig();
    
    // Check if we're at the limit
    if (this.currentLoads >= config.maxConcurrentLoads) {
      throw new Error('Too many concurrent loads');
    }

    // Determine imageType from options or default to 'media'
    const imageType = options.imageType || 'media';

    // Check memory cache first with size limit (use normalized URL for cache key)
    if (this.memoryCache.has(normalizedUrl)) {
      const cached = this.memoryCache.get(normalizedUrl)!;
      if (this.isCacheValid(cached) && this.isBlobValid(cached.blob)) {
        this.updateAccessMetrics(cached);
        this.cacheHits++;
        this.updateMetrics();
        return this.createObjectURL(cached.blob);
      } else {
        // Cache entry is invalid or blob is corrupted - remove it
        this.memoryCache.delete(normalizedUrl);
        // Also clear from persistent cache if blob is invalid
        if (!this.isBlobValid(cached.blob)) {
          await this.clearImageFromCache(normalizedUrl);
        }
      }
    }

    // For Safari iOS, skip persistent cache entirely
    if (isIOS) {
      return this.loadFromNetworkInternal(normalizedUrl, imageType, { ...options, timeout: options.timeout || 10000 });
    }

    // For non-iOS browsers, use persistent cache (use normalized URL for cache key)
    const cachedImage = await this.getFromPersistentCache(normalizedUrl);
    if (cachedImage && this.isCacheValid(cachedImage)) {
      // Validate blob before using it - corrupted blobs can cause 404-like errors
      if (this.isBlobValid(cachedImage.blob)) {
        // Store in memory cache with size limit
        if (this.memoryCache.size < config.maxMemoryCacheSize) {
          this.memoryCache.set(normalizedUrl, cachedImage);
        } else {
          // Remove oldest entry if cache is full
          const oldestKey = this.memoryCache.keys().next().value;
          if (oldestKey) {
            this.memoryCache.delete(oldestKey);
            this.memoryCache.set(normalizedUrl, cachedImage);
          }
        }
        this.updateAccessMetrics(cachedImage);
        this.cacheHits++;
        this.updateMetrics();
        return this.createObjectURL(cachedImage.blob);
      } else {
        // Blob is invalid - clear from cache and load from network
        this.logService.log(
          LevelLogEnum.WARN,
          'MobileImageCacheService',
          'Invalid blob found in cache - clearing and reloading from network',
          { imageUrl: normalizedUrl, blobSize: cachedImage.blob?.size, blobType: cachedImage.blob?.type }
        );
        await this.clearImageFromCache(normalizedUrl);
        // Fall through to load from network
      }
    }

    // Load from network (URL already normalized) - pass options for context in error logs
    return this.loadFromNetworkInternal(normalizedUrl, imageType, { ...options, timeout: options.timeout || 15000 });
  }

  /**
   * Load image with strict load control
   */
  loadImage(imageUrl: string, imageType: 'profile' | 'publication' | 'media' = 'media', options: ImageLoadOptions = {}): Observable<string> {
    // Normalize URL before using it
    const normalizedUrl = this._utilityService.normalizeImageUrl(imageUrl, environment.MINIO_BUCKET_URL || '');
    
    // Validate that normalized URL is absolute (http/https/blob/data)
    // If URL is still relative, it means MINIO_BUCKET_URL is not configured
    const isValidUrl = normalizedUrl.startsWith('http://') ||
                       normalizedUrl.startsWith('https://') ||
                       normalizedUrl.startsWith('blob:') ||
                       normalizedUrl.startsWith('data:');
    
    if (!isValidUrl) {
      // URL is still relative - cannot load
      this.logService.log(
        LevelLogEnum.WARN,
        'MobileImageCacheService',
        'Cannot load image - URL is relative and MINIO_BUCKET_URL may not be configured',
        { originalUrl: imageUrl, normalizedUrl, imageType, minioBucketUrl: environment.MINIO_BUCKET_URL }
      );
      return new Observable(observer => {
        observer.error(new Error('Invalid image URL - URL is relative and MINIO_BUCKET_URL is not configured'));
        observer.complete();
      });
    }
    
    // Add imageType to options for context in error logs
    // Preserve all original options including publicationId, commentId, etc.
    const optionsWithType = { ...options, imageType } as any;
    
    // Debug: Log if publicationId is being passed (temporary)
    if ((options as any)?.publicationId) {
      // Publication ID is being passed - this is good
    }
    
    const config = this.getCurrentConfig();
    
    // Check if we're at the limit
    if (this.currentLoads >= config.maxConcurrentLoads) {
      // Queue the load request with options for context
      return new Observable(observer => {
        this.loadQueue.push({
          url: normalizedUrl,
          resolve: (url: string) => observer.next(url),
          reject: (error: any) => {
            // Mirror ImageService behavior: use fallbackUrl on error
            if (options.fallbackUrl) {
              observer.next(options.fallbackUrl);
            } else {
              observer.error(error);
            }
          },
          options: optionsWithType
        });
        
        this.processLoadQueue();
      });
    }

    // Try to load immediately
    return new Observable(observer => {
      // Pass options with imageType to loadImageInternal for context in error logs
      this.loadImageInternal(normalizedUrl, optionsWithType)
        .then(url => observer.next(url))
        .catch(error => {
          // Log error here as well in case it's not caught in loadFromNetworkInternal
          // Extract error status - handle both HttpErrorResponse and plain errors
          let errorStatus: number | null = null;
          let errorMessage = '';
          
          if (error instanceof HttpErrorResponse) {
            errorStatus = error.status;
            errorMessage = error.message || error.error?.message || String(error);
          } else if (error?.status) {
            errorStatus = error.status;
            errorMessage = error.message || String(error);
          } else if (error?.message) {
            errorMessage = error.message;
            if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
              errorStatus = 404;
            }
          }
          
          const is404 = errorStatus === 404 || 
                       errorMessage?.includes('404') || 
                       errorMessage?.includes('Not Found') ||
                       (error instanceof HttpErrorResponse && error.status === 404);
          
          // Log 404 errors with detailed information (fallback logging)
          if (is404) {
            this.logService.log(
              LevelLogEnum.ERROR,
              'MobileImageCacheService',
              'Image not found (404) - Image may have been deleted from storage (caught in Observable)',
              {
                imageUrl: normalizedUrl,
                imageType,
                errorStatus: errorStatus || 'unknown',
                errorMessage: errorMessage || String(error),
                errorName: error?.name,
                errorType: error?.constructor?.name,
                isHttpErrorResponse: error instanceof HttpErrorResponse,
                httpErrorUrl: error instanceof HttpErrorResponse ? error.url : null,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                // Include context if available in options
                publicationId: (options as any)?.publicationId,
                commentId: (options as any)?.commentId,
                mediaId: (options as any)?.mediaId
              }
            );
          }
          // Mirror ImageService behavior: use fallbackUrl on error instead of propagating
          if (options.fallbackUrl) {
            observer.next(options.fallbackUrl);
          } else {
            observer.error(error);
          }
        })
        .finally(() => observer.complete());
    });
  }

  private async getFromPersistentCache(imageUrl: string): Promise<CachedImage | null> {
    if (!this.db) return null;

    // Normalize URL before looking it up in cache
    const normalizedUrl = this._utilityService.normalizeImageUrl(imageUrl, environment.MINIO_BUCKET_URL || '');

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        // Try to get with normalized URL first
        const request = store.get(normalizedUrl);

        request.onsuccess = () => {
          const result = request.result;
          if (result) {
            // If found with normalized URL, return it
            resolve(result);
          } else {
            // If not found, try with original URL (for backward compatibility with old cache entries)
            const fallbackRequest = store.get(imageUrl);
            fallbackRequest.onsuccess = () => resolve(fallbackRequest.result || null);
            fallbackRequest.onerror = () => resolve(null);
          }
        };
        request.onerror = () => {
          // iOS Safari specific error handling
          if (isIOS) {
            resolve(null); // Don't fail completely, fall back to network
          } else {
            reject(request.error);
          }
        };
      } catch (error) {
        // iOS Safari sometimes throws errors during IndexedDB operations
        if (isIOS) {
          resolve(null); // Don't fail completely, fall back to network
        } else {
          reject(error);
        }
      }
    });
  }

  private isCrossOriginUrl(url: string): boolean {
    try {
      return new URL(url, window.location.href).origin !== window.location.origin;
    } catch {
      return false;
    }
  }

  private preloadViaNativeImage(url: string, timeoutMs: number): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const img = new Image();
      const timer = setTimeout(() => {
        img.onload = img.onerror = null;
        reject(new Error('Native image preload timed out'));
      }, timeoutMs);

      img.onload = () => {
        clearTimeout(timer);
        resolve(url);
      };
      img.onerror = () => {
        clearTimeout(timer);
        reject(new Error('Native image preload failed'));
      };
      img.src = url;
    });
  }

  private async loadFromNetworkInternal(imageUrl: string, imageType: 'profile' | 'publication' | 'media', options: ImageLoadOptions): Promise<string> {
    // Validate URL - must be absolute (http/https/blob/data)
    // If URL is relative, it means MINIO_BUCKET_URL is not configured
    const isValidUrl = imageUrl && (
      imageUrl.startsWith('http://') ||
      imageUrl.startsWith('https://') ||
      imageUrl.startsWith('blob:') ||
      imageUrl.startsWith('data:')
    );
    
    if (!isValidUrl) {
      // URL is still relative - cannot load
      this.logService.log(
        LevelLogEnum.WARN,
        'MobileImageCacheService',
        'Cannot load image - URL is relative and MINIO_BUCKET_URL may not be configured',
        { imageUrl, imageType }
      );
      throw new Error('Invalid image URL - URL is relative and MINIO_BUCKET_URL is not configured');
    }

    // Cross-origin images (e.g. MinIO at api-minio.compuelec.cl) cannot be fetched as a blob
    // via XHR unless the storage server returns CORS headers — and when the server is down the
    // browser reports the failure as a misleading CORS error. Warm the cache with a native
    // Image() preload instead (no CORS requirement) and let <img src> render the URL directly.
    if (this.isCrossOriginUrl(imageUrl)) {
      return this.preloadViaNativeImage(imageUrl, options.timeout || 15000);
    }

    // Validate URL for iOS Safari
    if (isIOS) {
      if (!imageUrl || !imageUrl.startsWith('http')) {
        throw new Error('Invalid image URL for iOS Safari');
      }
    }

    const response = await firstValueFrom(
      this.http.get(imageUrl, {
        responseType: 'blob'
      }).pipe(
        timeout(options.timeout || 15000),
        catchError((error: any) => {
          // Handle HttpErrorResponse from Angular HttpClient
          let errorStatus: number | null = null;
          let errorMessage = '';
          
          if (error instanceof HttpErrorResponse) {
            errorStatus = error.status;
            errorMessage = error.message || error.error?.message || String(error);
          } else if (error?.status) {
            // Plain error object with status
            errorStatus = error.status;
            errorMessage = error.message || String(error);
          } else if (error?.message) {
            // Check if message contains 404
            errorMessage = error.message;
            if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
              errorStatus = 404;
            }
          }
          
          // Also check the URL itself for 404 patterns
          const urlContains404 = imageUrl.includes('404') || imageUrl.includes('not-found');
          
          const is404 = errorStatus === 404 || 
                       errorMessage?.includes('404') || 
                       errorMessage?.includes('Not Found') ||
                       urlContains404 ||
                       (error instanceof HttpErrorResponse && error.status === 404);
          
          // Log 404 errors with detailed information
          if (is404) {
            // Extract context from options
            const publicationId = (options as any)?.publicationId;
            const commentId = (options as any)?.commentId;
            const mediaId = (options as any)?.mediaId;
            
            // Try to extract userId from URL if publicationId is not available
            let userIdFromUrl: string | null = null;
            let fullUrlPath: string | null = null;
            if (!publicationId && imageUrl.includes('/publications/')) {
              const urlMatch = imageUrl.match(/publications\/([^\/\?]+)/);
              if (urlMatch && urlMatch[1]) {
                // Extract userId from URL pattern: userId|timestamp-filename
                const urlPart = urlMatch[1];
                fullUrlPath = urlPart;
                const userIdMatch = urlPart.match(/^([^|]+)/);
                if (userIdMatch && userIdMatch[1]) {
                  userIdFromUrl = userIdMatch[1];
                }
              }
            }
            
            // Clear invalid image from cache when 404 is detected
            // This prevents stale cache entries from causing repeated 404 errors
            this.clearImageFromCache(imageUrl).catch(clearError => {
              // Log cache clear error but don't block the main error logging
              this.logService.log(
                LevelLogEnum.WARN,
                'MobileImageCacheService',
                'Failed to clear invalid image from cache',
                { imageUrl, clearError: String(clearError) }
              );
            });
            
            const logData: any = {
              imageUrl,
              imageType,
              errorStatus: errorStatus || 'unknown',
              errorMessage: errorMessage || String(error),
              errorName: error?.name,
              errorType: error?.constructor?.name,
              isHttpErrorResponse: error instanceof HttpErrorResponse,
              httpErrorUrl: error instanceof HttpErrorResponse ? error.url : null,
              normalizedUrl: imageUrl,
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent,
              // Include context if available in options
              publicationId: publicationId || null,
              commentId: commentId || null,
              mediaId: mediaId || null,
              // Additional debugging info
              errorKeys: error ? Object.keys(error) : [],
              errorString: String(error),
              // Debug: show all options keys to see what's being passed
              optionsKeys: options ? Object.keys(options) : [],
              fullOptions: options,
              // Cache cleanup info
              cacheCleared: true,
              // URL extraction info (if publicationId not available)
              userIdFromUrl: userIdFromUrl,
              fullUrlPath: fullUrlPath
            };
            
            // Log to service (will be sent in batch to backend)
            // This log will appear in the system logs database
            // Use a more specific message that includes the image URL for easier searching
            const imageFileName = imageUrl.split('/').pop() || imageUrl;
            const shortUrl = imageFileName.length > 50 ? imageFileName.substring(0, 50) + '...' : imageFileName;
            const publicationContext = publicationId || userIdFromUrl || 'unknown';
            
            // Create a searchable message that includes key terms for easy filtering in admin panel
            // Terms: "404", "Image", "Missing", "PublicationId", filename
            
            // Force immediate send for critical 404 errors to ensure they appear in logs quickly
            // Message includes key searchable terms: "404", "Missing Image", "PublicationId", filename
            // This makes it easy to find in the admin logs panel by searching for "404", "Missing", "Image", or the filename
            const logMessage = `[404 Missing Image] File: ${shortUrl} | PublicationId: ${publicationContext} | Image deleted from storage or cache invalid. Cache cleared automatically.`;
            
            this.logService.log(
              LevelLogEnum.ERROR,
              'MobileImageCacheService',
              logMessage,
              logData,
              true // forceImmediate = true for critical errors
            );
          }
          throw error;
        })
      )
    );

    const blob = response as Blob;
    
    // Validate downloaded blob
    if (!blob || blob.size === 0) {
      throw new Error('Invalid blob received from network');
    }

    // For iOS Safari, validate blob type
    if (isIOS && !blob.type.startsWith('image/')) {
      
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

    // Store in persistent cache (except for iOS Safari)
    if (!isIOS && config.persistentCache) {
      this.storeInPersistentCache(cachedImage).catch(error => {
        this.logService.log(LevelLogEnum.ERROR, 'MobileImageCacheService', 'Failed to store in persistent cache', { error });
      });
    }

    // Store in memory cache with size limit (use normalized URL as key)
    // imageUrl is already normalized at this point (from loadImageInternal)
    if (this.memoryCache.size < config.maxMemoryCacheSize) {
      this.memoryCache.set(imageUrl, cachedImage);
    } else {
      // Remove oldest entry if cache is full
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
        this.memoryCache.set(imageUrl, cachedImage);
      }
    }

    this.cacheMisses++;
    this.updateMetrics();

    return this.createObjectURL(cachedImage.blob);
  }

  private async storeInPersistentCache(cachedImage: CachedImage): Promise<void> {
    // Early return for iOS Safari - completely avoid IndexedDB operations
    if (isIOS) {
      return;
    }

    if (!this.db) return;

    return new Promise((resolve, reject) => {
      try {
        // Validate blob before storing
        if (!cachedImage.blob || cachedImage.blob.size === 0) {
  
          resolve();
          return;
        }

        // Additional validation for blob type
        if (!cachedImage.blob.type.startsWith('image/')) {
          
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

        request.onerror = () => {
          const error = request.error;
          this.logService.log(LevelLogEnum.ERROR, 'MobileImageCacheService', 'Failed to store in persistent cache', { 
            url: cachedImage.url, 
            error: error?.message 
          });
          reject(error);
        };
      } catch (error) {
        // iOS Safari sometimes throws errors during IndexedDB operations
        if (isIOS) {

          resolve(); // Don't fail completely
        } else {
          reject(error);
        }
      }
    });
  }

  private isCacheValid(cachedImage: CachedImage): boolean {
    return Date.now() < cachedImage.expiresAt;
  }

  /**
   * Validate that a blob is actually a valid image blob
   * Checks for size, type, and basic integrity
   */
  private isBlobValid(blob: Blob | null | undefined): boolean {
    if (!blob) {
      return false;
    }

    // Check blob size - must be greater than 0
    if (blob.size === 0) {
      return false;
    }

    // Check blob type - must be an image type
    if (!blob.type || !blob.type.startsWith('image/')) {
      return false;
    }

    // Additional validation: check if blob is not too small (likely corrupted)
    // Minimum size for a valid image is typically around 100 bytes
    if (blob.size < 100) {
      return false;
    }

    return true;
  }

  private isGoogleImage(url: string): boolean {
    return url.includes('googleusercontent.com') || url.includes('google.com');
  }

  private handleGoogleImage(imageUrl: string, imageType: 'profile' | 'publication' | 'media', options: ImageLoadOptions): Observable<string> {
    // Use Google Image Service for Google Images
    return this.imageService.loadImage(imageUrl, options);
  }

  private updateAccessMetrics(cachedImage: CachedImage): void {
    cachedImage.lastAccessed = Date.now();
    cachedImage.accessCount++;
  }

  private getOptimizedTimeout(options: ImageLoadOptions = {}): number {
    const config = this.getCurrentConfig();
    const baseTimeout = options.timeout || 30000;
    
    // Reduce timeout for mobile devices
    if (this.isMobileDevice) {
      return Math.min(baseTimeout, 15000);
    }
    
    return baseTimeout;
  }

  private getRetryConfig(): { maxRetries: number; retryDelay: number } {
    return {
      maxRetries: this.isMobileDevice ? 1 : 2, // Reduced retries
      retryDelay: this.isMobileDevice ? 3000 : 2000
    };
  }

  /**
   * Preload images with strict limits
   */
  preloadImages(
    imageUrls: string[], 
    imageType: 'profile' | 'publication' | 'media' = 'media', 
    priority: 'high' | 'medium' | 'low' = 'medium',
    options?: ImageLoadOptions
  ): void {
    const config = this.getCurrentConfig();
    
    // Limit preload based on device type - very conservative
    const maxPreload = Math.min(config.preloadThreshold, 2); // Maximum 2 images
    const urlsToPreload = imageUrls.slice(0, maxPreload);
    
    urlsToPreload.forEach(url => {
      // Merge priority with any additional options (like publicationId, commentId, etc.)
      const loadOptions = {
        priority,
        ...options
      } as any;
      
      this.loadImage(url, imageType, loadOptions).subscribe({
        next: () => {
          // Image preloaded successfully - no need to log
        },
        error: (error) => {
          // Error handled by loadImage with context logging if options provided
        }
      });
    });
  }

  getCacheMetrics(): Observable<CacheMetrics> {
    return this.cacheMetrics.asObservable();
  }

  async clearCache(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();
    this.cacheSize = 0;

    // Clear persistent cache
    if (this.db) {
      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      await store.clear();
    }

    // Clear object URLs
    this.createdObjectUrls.forEach(url => {
      URL.revokeObjectURL(url);
    });
    this.createdObjectUrls.clear();

    // Clear load queue
    this.loadQueue = [];
    this.currentLoads = 0;

    // Reset metrics
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.loadTimes = [];
    this.updateMetrics();
  }

  /**
   * Clear a specific image from cache (memory and persistent)
   * Useful when an image is updated and needs to be refreshed
   */
  async clearImageFromCache(imageUrl: string): Promise<void> {
    // Normalize URL before clearing from cache
    const normalizedUrl = this._utilityService.normalizeImageUrl(imageUrl, environment.MINIO_BUCKET_URL || '');
    
    // Clear from memory cache (try both normalized and original URL for backward compatibility)
    if (this.memoryCache.has(normalizedUrl)) {
      const cached = this.memoryCache.get(normalizedUrl);
      if (cached) {
        this.cacheSize -= cached.size;
      }
      this.memoryCache.delete(normalizedUrl);
    }
    // Also try with original URL in case it was cached with the original URL
    if (imageUrl !== normalizedUrl && this.memoryCache.has(imageUrl)) {
      const cached = this.memoryCache.get(imageUrl);
      if (cached) {
        this.cacheSize -= cached.size;
      }
      this.memoryCache.delete(imageUrl);
    }

    // Clear from persistent cache (try both normalized and original URL)
    if (this.db && !isIOS) {
      try {
        const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        store.delete(normalizedUrl);
        // Also try with original URL for backward compatibility
        if (imageUrl !== normalizedUrl) {
          store.delete(imageUrl);
        }
      } catch (error) {
        // Ignore errors when clearing specific image
      }
    }
  }

  /**
   * Clear all profile images from cache
   * Useful when user changes their avatar
   */
  async clearProfileImagesFromCache(): Promise<void> {
    // Clear profile images from memory cache
    const keysToDelete: string[] = [];
    this.memoryCache.forEach((value, key) => {
      if (value.type === 'profile' || key.includes('profile-avatar') || key.includes('profile/')) {
        keysToDelete.push(key);
        this.cacheSize -= value.size;
      }
    });
    keysToDelete.forEach(key => this.memoryCache.delete(key));

    // Clear profile images from persistent cache
    if (this.db && !isIOS) {
      try {
        const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const index = store.index('type');
        const request = index.openCursor(IDBKeyRange.only('profile'));

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            store.delete(cursor.primaryKey);
            cursor.continue();
          }
        };
      } catch (error) {
        // Ignore errors when clearing profile images
      }
    }
  }

  async getCacheStats(): Promise<any> {
    const persistentStats = await this.getPersistentCacheStats();
    const config = this.getCurrentConfig();
    
    return {
      memoryCacheSize: this.memoryCache.size,
      memoryCacheLimit: config.maxMemoryCacheSize,
      persistentCacheSize: persistentStats.size,
      persistentCacheLimit: config.maxCacheSize,
      objectUrlsCount: this.createdObjectUrls.size,
      objectUrlsLimit: this.maxObjectUrls,
      currentLoads: this.currentLoads,
      maxConcurrentLoads: config.maxConcurrentLoads,
      loadQueueLength: this.loadQueue.length,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0,
      averageLoadTime: this.loadTimes.length > 0 ? this.loadTimes.reduce((a, b) => a + b, 0) / this.loadTimes.length : 0
    };
  }

  private async getPersistentCacheStats(): Promise<any> {
    if (!this.db) {
      return { size: 0, count: 0 };
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const items = request.result || [];
          const totalSize = items.reduce((sum, item) => sum + (item.size || 0), 0);
          
          resolve({
            size: totalSize,
            count: items.length
          });
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (error) {
        resolve({ size: 0, count: 0 });
      }
    });
  }

  async optimizeForMobile(): Promise<void> {
    const config = this.getCurrentConfig();
    
    // Reduce memory cache size for mobile
    if (this.memoryCache.size > config.maxMemoryCacheSize) {
      const entriesToRemove = Array.from(this.memoryCache.entries())
        .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)
        .slice(0, this.memoryCache.size - config.maxMemoryCacheSize);
      
      entriesToRemove.forEach(([key]) => {
        this.memoryCache.delete(key);
      });
    }
    
    // Clean up old cache
    await this.cleanupOldCache();
    
    // Clear load queue
    this.loadQueue = [];
    this.currentLoads = 0;
    

  }

  private cacheMonitoringInterval: any;

  private startCacheMonitoring(): void {
    if (this.cacheMonitoringInterval) {
      clearInterval(this.cacheMonitoringInterval);
    }
    
    this.cacheMonitoringInterval = setInterval(() => {
      this.monitorCacheSize();
    }, 30000); // Check every 30 seconds (reduced from 60)
  }

  private stopCacheMonitoring(): void {
    if (this.cacheMonitoringInterval) {
      clearInterval(this.cacheMonitoringInterval);
      this.cacheMonitoringInterval = null;
    }
  }

  /**
   * Monitor cache size
   */
  private async monitorCacheSize(): Promise<void> {
    const stats = await this.getPersistentCacheStats();
    const config = this.getCurrentConfig();
    
    if (stats.size > config.maxCacheSize) {

      
      // Trigger cleanup
      await this.cleanupOldCache();
    }
  }

  private async cleanupOldCache(): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result || [];
        const now = Date.now();
        const config = this.getCurrentConfig();
        
        // Remove expired items
        items.forEach(item => {
          if (item.expiresAt && now > item.expiresAt) {
            store.delete(item.url);
          }
        });
        
        // If still too large, remove oldest items
        if (items.length > config.maxCacheSize / (1024 * 1024)) {
          const sortedItems = items
            .filter(item => !item.expiresAt || now <= item.expiresAt)
            .sort((a, b) => a.lastAccessed - b.lastAccessed);
          
          const itemsToRemove = sortedItems.slice(0, Math.floor(sortedItems.length / 2));
          itemsToRemove.forEach(item => {
            store.delete(item.url);
          });
        }
      };
    } catch (error) {
      this.logService.log(LevelLogEnum.ERROR, 'MobileImageCacheService', 'Error cleaning up old cache', { error });
    }
  }

  private trackLoadTime(loadTime: number): void {
    this.loadTimes.push(loadTime);
    
    // Keep only last 50 load times (reduced from 100)
    if (this.loadTimes.length > 50) {
      this.loadTimes.shift();
    }
  }

  private async updateMetrics(): Promise<void> {
    const stats = await this.getPersistentCacheStats();
    const totalRequests = this.cacheHits + this.cacheMisses;
    
    this.cacheMetrics.next({
      totalImages: this.memoryCache.size + stats.count,
      cacheSize: this.cacheSize + stats.size,
      hitRate: totalRequests > 0 ? this.cacheHits / totalRequests : 0,
      missRate: totalRequests > 0 ? this.cacheMisses / totalRequests : 0,
      averageLoadTime: this.loadTimes.length > 0 ? this.loadTimes.reduce((a, b) => a + b, 0) / this.loadTimes.length : 0,
      mobileOptimized: this.isMobileDevice,
      persistentCacheSize: stats.size
    });
  }

  isMobile(): boolean {
    return this.isMobileDevice;
  }

  getConfig(): MobileCacheConfig {
    return this.getCurrentConfig();
  }

  async forceOptimization(): Promise<void> {
    await this.optimizeForMobile();
    this.cleanupObjectUrls();
    this.loadQueue = [];
    this.currentLoads = 0;

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
    if (this.memoryCache.size > config.maxMemoryCacheSize) {
      issues.push('Memory cache size too large');
    }
    
    // Check object URLs
    if (this.createdObjectUrls.size > this.maxObjectUrls * 0.9) {
      issues.push('Too many object URLs');
    }
    
    // Check load queue
    if (this.loadQueue.length > 10) {
      issues.push('Load queue too large');
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
    
    // Cleanup object URLs
    this.cleanupObjectUrls();
    
    // Clear load queue
    this.loadQueue = [];
    this.currentLoads = 0;
    
    // Reinitialize database if needed
    if (!this.db) {
      await this.initializeDatabase();
    }
    
    // iOS cache recovery completed - no need to log every recovery
  }

  cleanup(): void {
    this.stopCacheMonitoring();
    
    // Clean up object URLs
    this.createdObjectUrls.forEach(url => {
      URL.revokeObjectURL(url);
    });
    this.createdObjectUrls.clear();
    
    // Clear load queue
    this.loadQueue = [];
    this.currentLoads = 0;
  }

  async closeConnection(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.memoryCache.clear();
    this.stopCacheMonitoring();
    
    // Clean up object URLs
    this.createdObjectUrls.forEach(url => {
      URL.revokeObjectURL(url);
    });
    this.createdObjectUrls.clear();
    
    // Clear load queue
    this.loadQueue = [];
    this.currentLoads = 0;
  }
}
