import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { LogService, LevelLogEnum } from './core-apis/log.service';
import { ImageService, ImageLoadOptions } from './image.service';

export interface MobileCacheConfig {
  maxCacheSize: number;
  maxAge: number;
  preloadThreshold: number;
  compressionEnabled: boolean;
  offlineMode: boolean;
}

export interface CacheMetrics {
  totalImages: number;
  cacheSize: number;
  hitRate: number;
  missRate: number;
  averageLoadTime: number;
  mobileOptimized: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MobileImageCacheService {
  private readonly MOBILE_CONFIG: MobileCacheConfig = {
    maxCacheSize: 50 * 1024 * 1024, // 50MB for mobile
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    preloadThreshold: 3, // Preload next 3 images
    compressionEnabled: true,
    offlineMode: false
  };

  private readonly DESKTOP_CONFIG: MobileCacheConfig = {
    maxCacheSize: 100 * 1024 * 1024, // 100MB for desktop
    maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
    preloadThreshold: 5, // Preload next 5 images
    compressionEnabled: false,
    offlineMode: false
  };

  private isMobileDevice = false;
  private cacheMetrics = new BehaviorSubject<CacheMetrics>({
    totalImages: 0,
    cacheSize: 0,
    hitRate: 0,
    missRate: 0,
    averageLoadTime: 0,
    mobileOptimized: false
  });

  private cacheHits = 0;
  private cacheMisses = 0;
  private loadTimes: number[] = [];

  constructor(
    private imageService: ImageService,
    private logService: LogService
  ) {
    this.initializeService();
  }

  private initializeService(): void {
    // Detect mobile device
    this.isMobileDevice = this.detectMobileDevice();
    
    // Setup mobile optimizations
    this.setupMobileOptimizations();
    
    // Monitor cache performance
    this.startCacheMonitoring();
    
    this.logService.log(LevelLogEnum.INFO, 'MobileImageCacheService', 'Service initialized', {
      isMobile: this.isMobileDevice,
      config: this.getCurrentConfig()
    });
  }

  private detectMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  private getCurrentConfig(): MobileCacheConfig {
    return this.isMobileDevice ? this.MOBILE_CONFIG : this.DESKTOP_CONFIG;
  }

  private setupMobileOptimizations(): void {
    if (this.isMobileDevice) {
      // Enable aggressive caching for mobile
      this.enableAggressiveCaching();
      
      // Setup connection monitoring
      this.setupConnectionMonitoring();
      
      // Enable offline mode detection
      this.setupOfflineModeDetection();
    }
  }

  private enableAggressiveCaching(): void {
    // Configure Service Worker for aggressive caching
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
      
      // Initial adjustment
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

  /**
   * Load image with mobile optimizations
   */
  loadImage(imageUrl: string, options: ImageLoadOptions = {}): Observable<string> {
    const startTime = performance.now();
    const config = this.getCurrentConfig();
    
    // Mobile-specific options
    const mobileOptions: ImageLoadOptions = {
      ...options,
      useServiceWorkerCache: true,
      timeout: this.isMobileDevice ? 15000 : 10000,
      maxRetries: this.isMobileDevice ? 2 : 3
    };

    return this.imageService.loadImage(imageUrl, mobileOptions).pipe(
      // Track performance
      (source) => {
        return new Observable(observer => {
          source.subscribe({
            next: (url) => {
              const loadTime = performance.now() - startTime;
              this.trackLoadTime(loadTime);
              this.cacheHits++;
              this.updateMetrics();
              observer.next(url);
              observer.complete();
            },
            error: (error) => {
              const loadTime = performance.now() - startTime;
              this.trackLoadTime(loadTime);
              this.cacheMisses++;
              this.updateMetrics();
              observer.error(error);
            }
          });
        });
      }
    );
  }

  /**
   * Preload images for better mobile experience
   */
  preloadImages(imageUrls: string[], priority: 'high' | 'medium' | 'low' = 'medium'): void {
    const config = this.getCurrentConfig();
    const urlsToPreload = imageUrls.slice(0, config.preloadThreshold);
    
    this.logService.log(LevelLogEnum.INFO, 'MobileImageCacheService', 'Preloading images', {
      total: imageUrls.length,
      preloading: urlsToPreload.length,
      priority
    });

    urlsToPreload.forEach(url => {
      this.imageService.preloadImage(url, { priority });
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
  clearCache(): void {
    this.imageService.clearCache();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.loadTimes = [];
    this.updateMetrics();
    
    this.logService.log(LevelLogEnum.INFO, 'MobileImageCacheService', 'Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): any {
    const stats = this.imageService.getCacheStats();
    const config = this.getCurrentConfig();
    
    return {
      ...stats,
      mobileOptimized: this.isMobileDevice,
      config,
      metrics: this.cacheMetrics.value
    };
  }

  /**
   * Optimize cache for mobile
   */
  optimizeForMobile(): void {
    if (!this.isMobileDevice) return;
    
    // Clear old cache entries
    this.cleanupOldCache();
    
    // Compress cached images if enabled
    if (this.getCurrentConfig().compressionEnabled) {
      this.compressCachedImages();
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
  private monitorCacheSize(): void {
    const stats = this.imageService.getCacheStats();
    const config = this.getCurrentConfig();
    
    if (stats.size > config.maxCacheSize) {
      this.logService.log(LevelLogEnum.WARN, 'MobileImageCacheService', 'Cache size limit reached', {
        currentSize: stats.size,
        maxSize: config.maxCacheSize
      });
      
      // Trigger cleanup
      this.cleanupOldCache();
    }
  }

  /**
   * Cleanup old cache entries
   */
  private cleanupOldCache(): void {
    // This would be implemented based on your cache implementation
    this.logService.log(LevelLogEnum.INFO, 'MobileImageCacheService', 'Cache cleanup triggered');
  }

  /**
   * Compress cached images
   */
  private compressCachedImages(): void {
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
  private updateMetrics(): void {
    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate = totalRequests > 0 ? this.cacheHits / totalRequests : 0;
    const missRate = totalRequests > 0 ? this.cacheMisses / totalRequests : 0;
    const averageLoadTime = this.loadTimes.length > 0 
      ? this.loadTimes.reduce((a, b) => a + b, 0) / this.loadTimes.length 
      : 0;

    const stats = this.imageService.getCacheStats();
    
    this.cacheMetrics.next({
      totalImages: stats.size,
      cacheSize: stats.size,
      hitRate,
      missRate,
      averageLoadTime,
      mobileOptimized: this.isMobileDevice
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
  forceOptimization(): void {
    this.optimizeForMobile();
    this.logService.log(LevelLogEnum.INFO, 'MobileImageCacheService', 'Forced optimization completed');
  }
} 