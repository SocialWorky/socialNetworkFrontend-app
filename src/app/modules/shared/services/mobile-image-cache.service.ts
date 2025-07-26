import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, from, throwError } from 'rxjs';
import { catchError, map, switchMap, tap, timeout } from 'rxjs/operators';
import { LogService, LevelLogEnum } from './core-apis/log.service';
import { ImageService, ImageLoadOptions } from './image.service';
import { HttpClient } from '@angular/common/http';

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
  etag?: string;
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
    private http: HttpClient
  ) {
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    this.isMobileDevice = this.detectMobileDevice();
    
    // For Safari iOS, completely disable IndexedDB to avoid errors
    if (isIOS) {
      this.logService.log(LevelLogEnum.INFO, 'MobileImageCacheService', 'Safari iOS detected, disabling IndexedDB completely');
      this.db = null; // Ensure no IndexedDB connection
      this.setupIOSOptimizations();
    } else {
      // Initialize IndexedDB only for non-iOS browsers
      await this.initDatabase();
    }
    
    // Setup mobile optimizations
    this.setupMobileOptimizations();
    
    // Monitor cache performance
    this.startCacheMonitoring();
    
    // Load cache metrics
    await this.updateMetrics();
    
    this.logService.log(LevelLogEnum.INFO, 'MobileImageCacheService', 'Service initialized', {
      isMobile: this.isMobileDevice,
      isIOS,
      useIndexedDB: !isIOS,
      config: this.getCurrentConfig()
    });
  }

  private detectMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  private getCurrentConfig(): MobileCacheConfig {
    if (isIOS) {
      return iOS_CONFIG;
    }
    return this.isMobileDevice ? this.MOBILE_CONFIG : this.DESKTOP_CONFIG;
  }

  private async initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if IndexedDB is available
      if (!('indexedDB' in window)) {
        this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'IndexedDB not supported, falling back to memory cache only');
        resolve();
        return;
      }

      // iOS Safari private browsing detection
      if (isIOS) {
        this.detectPrivateBrowsing().then(isPrivate => {
          if (isPrivate) {
            this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'iOS Safari private browsing detected, using memory cache only');
            resolve();
            return;
          }
          this.openDatabase(resolve, reject);
        }).catch(() => {
          this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'Could not detect private browsing, proceeding with caution');
          this.openDatabase(resolve, reject);
        });
      } else {
        this.openDatabase(resolve, reject);
      }
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
      this.logService.log(LevelLogEnum.INFO, 'MobileImageCacheService', 'IndexedDB opened successfully');
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
          this.logService.log(LevelLogEnum.INFO, 'MobileImageCacheService', 'Object store created successfully');
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

  private async detectPrivateBrowsing(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // Test IndexedDB availability
        const testRequest = indexedDB.open('test', 1);
        testRequest.onerror = () => {
          resolve(true); // Likely private browsing
        };
        testRequest.onsuccess = () => {
          // Clean up test database
          indexedDB.deleteDatabase('test');
          resolve(false); // Not private browsing
        };
      } catch (error) {
        resolve(true); // Error suggests private browsing
      }
    });
  }

  private setupMobileOptimizations(): void {
    if (this.isMobileDevice) {
      this.enableAggressiveCaching();
      this.setupConnectionMonitoring();
      this.setupOfflineModeDetection();
    }
  }

  private enableAggressiveCaching(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        this.logService.log(LevelLogEnum.INFO, 'MobileImageCacheService', 'Aggressive caching enabled for mobile');
      });
    }
  }

  private setupConnectionMonitoring(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      connection.addEventListener('change', () => {
        this.adjustCacheStrategy(connection.effectiveType);
      });
      
      this.adjustCacheStrategy(connection.effectiveType);
    }
  }

  private adjustCacheStrategy(connectionType: string): void {
    const config = this.getCurrentConfig();
    
    switch (connectionType) {
      case 'slow-2g':
      case '2g':
        config.preloadThreshold = 1;
        config.compressionEnabled = true;
        break;
      case '3g':
        config.preloadThreshold = 2;
        config.compressionEnabled = true;
        break;
      case '4g':
        config.preloadThreshold = 3;
        config.compressionEnabled = false;
        break;
      default:
        config.preloadThreshold = 5;
        config.compressionEnabled = false;
    }
    
    this.logService.log(LevelLogEnum.INFO, 'MobileImageCacheService', 'Cache strategy adjusted', {
      connectionType,
      preloadThreshold: config.preloadThreshold,
      compressionEnabled: config.compressionEnabled
    });
  }

  private setupOfflineModeDetection(): void {
    window.addEventListener('online', () => {
      this.MOBILE_CONFIG.offlineMode = false;
      this.logService.log(LevelLogEnum.INFO, 'MobileImageCacheService', 'Online mode enabled');
    });

    window.addEventListener('offline', () => {
      this.MOBILE_CONFIG.offlineMode = true;
      this.logService.log(LevelLogEnum.INFO, 'MobileImageCacheService', 'Offline mode enabled');
    });
  }

  private setupIOSOptimizations(): void {
    // iOS-specific memory management
    this.setupIOSMemoryManagement();
    
    // iOS-specific IndexedDB optimizations
    this.setupIOSIndexedDBOptimizations();
    
    // iOS-specific cache cleanup
    this.setupIOSCacheCleanup();
    
    this.logService.log(LevelLogEnum.INFO, 'MobileImageCacheService', 'iOS optimizations enabled');
  }

  private setupIOSMemoryManagement(): void {
    // iOS is more aggressive with memory management
    // Reduce memory cache size for iOS
    const maxMemoryCacheSize = 20; // Limit memory cache to 20 items on iOS
    
    // Monitor memory usage and cleanup when needed
    setInterval(() => {
      if (this.memoryCache.size > maxMemoryCacheSize) {
        const entries = Array.from(this.memoryCache.entries());
        // Remove oldest entries
        entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
        const toRemove = entries.slice(0, Math.floor(maxMemoryCacheSize / 2));
        toRemove.forEach(([key]) => this.memoryCache.delete(key));
        
        this.logService.log(LevelLogEnum.INFO, 'MobileImageCacheService', 'iOS memory cache cleaned', {
          removed: toRemove.length,
          remaining: this.memoryCache.size
        });
      }
    }, 30000); // Check every 30 seconds
  }

  private setupIOSIndexedDBOptimizations(): void {
    // iOS Safari has issues with large IndexedDB transactions
    // Use smaller transaction sizes and handle iOS-specific quirks
    if (this.db) {
      // iOS Safari has a limit on IndexedDB transaction size
      // We'll use smaller chunks for operations
      this.logService.log(LevelLogEnum.INFO, 'MobileImageCacheService', 'iOS IndexedDB optimizations applied');
    }
    
    // Handle iOS Safari IndexedDB quirks
    if (isIOS && 'indexedDB' in window) {
      // iOS Safari sometimes has issues with IndexedDB in private browsing
      try {
        const testRequest = indexedDB.open('test', 1);
        testRequest.onerror = () => {
          this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'IndexedDB not available in iOS private browsing mode');
        };
        testRequest.onsuccess = () => {
          indexedDB.deleteDatabase('test');
        };
      } catch (error) {
        this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'IndexedDB test failed on iOS', { error });
      }
    }
  }

  private setupIOSCacheCleanup(): void {
    // More frequent cache cleanup for iOS
    setInterval(() => {
      this.cleanupOldCache();
    }, 5 * 60 * 1000); // Every 5 minutes instead of default
    
    // iOS-specific memory pressure handling
    if (isIOS && 'memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        if (memory && memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.8) {
          this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'iOS memory pressure detected, cleaning memory cache');
          this.memoryCache.clear();
        }
      }, 10000); // Check every 10 seconds
    }
  }

  /**
   * Load image with mobile optimizations and persistent cache
   */
  loadImage(imageUrl: string, imageType: 'profile' | 'publication' | 'media' = 'media', options: ImageLoadOptions = {}): Observable<string> {
    const startTime = performance.now();
    const config = this.getCurrentConfig();
    
    // iOS-specific timeout adjustment
    const timeoutValue = isIOS ? (options.timeout || 15000) : (options.timeout || 30000);
    
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
        this.logService.log(LevelLogEnum.INFO, 'MobileImageCacheService', 'Image loaded from memory cache', { url: imageUrl, type: imageType, isIOS });
        return of(URL.createObjectURL(cached.blob));
      } else {
        this.memoryCache.delete(imageUrl);
      }
    }

    // For Safari iOS, skip persistent cache entirely
    if (isIOS) {
      this.logService.log(LevelLogEnum.INFO, 'MobileImageCacheService', 'Safari iOS: loading from network only', { url: imageUrl });
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
          this.logService.log(LevelLogEnum.ERROR, 'MobileImageCacheService', 'Error loading image on iOS', { url: imageUrl, error, isIOS });
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
          this.logService.log(LevelLogEnum.INFO, 'MobileImageCacheService', 'Image loaded from persistent cache', { url: imageUrl, type: imageType, isIOS });
          return of(URL.createObjectURL(cachedImage.blob));
        }

        // Load from network and cache
        return this.loadFromNetwork(imageUrl, imageType, { ...options, timeout: timeoutValue }).pipe(
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
        this.logService.log(LevelLogEnum.ERROR, 'MobileImageCacheService', 'Error loading image', { url: imageUrl, error, isIOS });
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

        this.logService.log(LevelLogEnum.INFO, 'MobileImageCacheService', 'Image loaded from network and cached', { 
          url: imageUrl, 
          size: blob.size, 
          loadTime: Math.round(loadTime),
          type: imageType,
          isIOS,
          usePersistentCache: !isIOS
        });

        return cachedImage;
      }),
      catchError(error => {
        const loadTime = performance.now() - startTime;
        this.logService.log(LevelLogEnum.ERROR, 'MobileImageCacheService', 'Failed to load image from network', { 
          url: imageUrl, 
          error: error.message, 
          loadTime: Math.round(loadTime),
          isIOS
        });
        return throwError(() => error);
      })
    );
  }

  private async storeInPersistentCache(cachedImage: CachedImage): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      try {
        // Validate blob before storing
        if (!cachedImage.blob || cachedImage.blob.size === 0) {
          this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'Invalid blob, skipping persistent cache', { url: cachedImage.url });
          resolve();
          return;
        }

        // For iOS Safari, validate blob type
        if (isIOS && !cachedImage.blob.type.startsWith('image/')) {
          this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'Invalid blob type for iOS, skipping persistent cache', { 
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
          etag: cachedImage.etag,
          expiresAt: cachedImage.expiresAt,
          blob: cachedImage.blob
        };

        const request = store.put(storageObject);

        request.onsuccess = () => {
          this.logService.log(LevelLogEnum.INFO, 'MobileImageCacheService', 'Image stored in persistent cache', { 
            url: cachedImage.url, 
            size: cachedImage.size 
          });
          resolve();
        };

        request.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          this.logService.log(LevelLogEnum.ERROR, 'MobileImageCacheService', 'Error storing in persistent cache', { 
            url: cachedImage.url, 
            error: error?.message 
          });

          // iOS Safari specific error handling
          if (isIOS) {
            if (error?.name === 'QuotaExceededError') {
              this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'iOS storage quota exceeded, cleaning up cache');
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
            } else if (error?.name === 'UnknownError' && error?.message?.includes('Blob')) {
              this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'iOS Blob storage error, using memory cache only', { error: error?.message });
              resolve(); // Don't fail completely, just use memory cache
            } else {
              this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'iOS IndexedDB error, using memory cache only', { error: error?.message });
              resolve(); // Don't fail completely
            }
          } else {
            reject(error);
          }
        };

        transaction.onerror = (event) => {
          const error = (event.target as IDBTransaction).error;
          this.logService.log(LevelLogEnum.ERROR, 'MobileImageCacheService', 'Transaction error', { error: error?.message });
          
          if (isIOS) {
            this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'iOS transaction error, using memory cache only');
            resolve(); // Don't fail completely
          } else {
            reject(error);
          }
        };

      } catch (error) {
        // iOS Safari sometimes throws errors during IndexedDB operations
        if (isIOS) {
          this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'iOS IndexedDB operation failed, falling back to memory cache', { error });
          resolve(); // Don't fail completely, just use memory cache
        } else {
          reject(error);
        }
      }
    });
  }

  private isCacheValid(cachedImage: CachedImage): boolean {
    return Date.now() < cachedImage.expiresAt;
  }

  private updateAccessMetrics(cachedImage: CachedImage): void {
    cachedImage.lastAccessed = Date.now();
    cachedImage.accessCount++;
    
    // Update in persistent cache
    this.storeInPersistentCache(cachedImage);
  }

  /**
   * Preload images for better mobile experience
   */
  preloadImages(imageUrls: string[], imageType: 'profile' | 'publication' | 'media' = 'media', priority: 'high' | 'medium' | 'low' = 'medium'): void {
    const config = this.getCurrentConfig();
    const urlsToPreload = imageUrls.slice(0, config.preloadThreshold);
    
    this.logService.log(LevelLogEnum.INFO, 'MobileImageCacheService', 'Preloading images', {
      total: imageUrls.length,
      preloading: urlsToPreload.length,
      type: imageType,
      priority
    });

    urlsToPreload.forEach(url => {
      this.loadImage(url, imageType, { priority }).subscribe({
        next: () => this.logService.log(LevelLogEnum.INFO, 'MobileImageCacheService', 'Image preloaded', { url, type: imageType }),
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
    this.logService.log(LevelLogEnum.INFO, 'MobileImageCacheService', 'Cache cleared');
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
    
    this.logService.log(LevelLogEnum.INFO, 'MobileImageCacheService', 'Mobile optimization completed');
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

    this.logService.log(LevelLogEnum.INFO, 'MobileImageCacheService', 'Cache cleanup completed');
  }

  /**
   * Compress cached images
   */
  private async compressCachedImages(): Promise<void> {
    // This would be implemented based on your image compression strategy
    this.logService.log(LevelLogEnum.INFO, 'MobileImageCacheService', 'Image compression triggered');
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
    this.logService.log(LevelLogEnum.INFO, 'MobileImageCacheService', 'Forced optimization completed');
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
      if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
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
    
    this.logService.log(LevelLogEnum.INFO, 'MobileImageCacheService', 'iOS cache health check completed', {
      healthy,
      issues,
      memoryCacheSize: this.memoryCache.size,
      persistentCacheSize: stats.size
    });
    
    return { healthy, issues };
  }

  /**
   * iOS-specific cache recovery
   */
  async recoverIOSCache(): Promise<void> {
    if (!isIOS) return;
    
    this.logService.log(LevelLogEnum.INFO, 'MobileImageCacheService', 'Starting iOS cache recovery');
    
    // Clear memory cache
    this.memoryCache.clear();
    
    // Cleanup persistent cache
    await this.cleanupOldCache();
    
    // Reinitialize database if needed
    if (!this.db) {
      await this.initDatabase();
    }
    
    this.logService.log(LevelLogEnum.INFO, 'MobileImageCacheService', 'iOS cache recovery completed');
  }
}
