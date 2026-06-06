import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, interval, takeUntil } from 'rxjs';
import { MobileImageCacheService } from './mobile-image-cache.service';
import { PublicationDatabaseService } from './database/publication-database.service';
import { LogService, LevelLogEnum } from './core-apis/log.service';

export interface CacheOptimizationConfig {
  enableAutoPreload: boolean;
  preloadInterval: number; // minutes
  maxImagesPerBatch: number;
  preloadThreshold: number; // connection speed threshold
}

export interface PreloadStats {
  totalPreloaded: number;
  successfulPreloads: number;
  failedPreloads: number;
  lastPreloadTime: Date | null;
  nextPreloadTime: Date | null;
}

@Injectable({
  providedIn: 'root'
})
export class CacheOptimizationService implements OnDestroy {
  private readonly DEFAULT_CONFIG: CacheOptimizationConfig = {
    enableAutoPreload: true,
    preloadInterval: 30,
    maxImagesPerBatch: 10,
    preloadThreshold: 2000
  };

  private readonly MOBILE_CONFIG: CacheOptimizationConfig = {
    enableAutoPreload: false, // Disable auto preload on mobile
    preloadInterval: 60, // Longer interval
    maxImagesPerBatch: 3, // Fewer images
    preloadThreshold: 5000 // Higher threshold
  };

  private config = this.DEFAULT_CONFIG;
  private preloadStats = new BehaviorSubject<PreloadStats>({
    totalPreloaded: 0,
    successfulPreloads: 0,
    failedPreloads: 0,
    lastPreloadTime: null,
    nextPreloadTime: null
  });

  private isPreloading = false;
  private preloadQueue = new Set<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private mobileImageCache: MobileImageCacheService,
    private publicationDatabase: PublicationDatabaseService,
    private logService: LogService
  ) {
    this.detectDeviceAndConfigure();
    this.initializeAutoPreload();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Detect device type and configure accordingly
   */
  private detectDeviceAndConfigure(): void {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isMobile) {
      this.config = { ...this.MOBILE_CONFIG };
      // Mobile device detected, using mobile configuration - no need to log device detection
    }
  }

  /**
   * Initialize automatic preloading
   */
  private initializeAutoPreload(): void {
    if (!this.config.enableAutoPreload) return;

    // Start periodic preloading
    interval(this.config.preloadInterval * 60 * 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.performAutoPreload();
      });

    // Delay initial preload on mobile
    const initialDelay = this.config === this.MOBILE_CONFIG ? 30000 : 10000;
    setTimeout(() => {
      this.performAutoPreload();
    }, initialDelay);
  }

  /**
   * Perform automatic preloading of important images
   */
  private async performAutoPreload(): Promise<void> {
    if (this.isPreloading) return;

    const connectionInfo = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connectionInfo && (connectionInfo.effectiveType === 'slow-2g' || connectionInfo.effectiveType === '2g')) {
      // Skipping preload due to slow connection - no need to log every skip
      return;
    }

    this.isPreloading = true;
          // Starting auto preload - no need to log every preload cycle

    try {
      const publications = await this.publicationDatabase.getAllPublications();
      const recentPublications = publications.slice(0, 5);

      const imageUrls: string[] = [];

      recentPublications.forEach(pub => {
        if (pub.author?.avatar) {
          imageUrls.push(pub.author.avatar);
        }
      });

      recentPublications.forEach(pub => {
        if (pub.media && pub.media.length > 0) {
          pub.media.forEach(media => {
            if (media.type === 'image' && media.urlCompressed) {
              imageUrls.push(media.urlCompressed);
            }
          });
        }
      });

      const uniqueUrls = [...new Set(imageUrls)].slice(0, this.config.maxImagesPerBatch);

      if (uniqueUrls.length > 0) {
        this.preloadImages(uniqueUrls);
      }

      const currentStats = this.preloadStats.value;
      this.preloadStats.next({
        ...currentStats,
        lastPreloadTime: new Date(),
        nextPreloadTime: new Date(Date.now() + this.config.preloadInterval * 60 * 1000)
      });

    } catch (error) {
      this.logService.log(LevelLogEnum.ERROR, 'CacheOptimizationService', 'Auto preload failed', { error });
    } finally {
      this.isPreloading = false;
    }
  }

  /**
   * Preload specific images
   */
  private preloadImages(imageUrls: string[]): void {
    imageUrls.forEach(url => {
      if (!this.preloadQueue.has(url)) {
        this.preloadQueue.add(url);
        
        this.mobileImageCache.loadImage(url, 'media', { priority: 'low' }).subscribe({
          next: () => {
            this.preloadQueue.delete(url);
            this.updatePreloadStats(true);
            // Image preloaded - no need to log every preload
          },
          error: (error) => {
            this.preloadQueue.delete(url);
            this.updatePreloadStats(false);
    
          }
        });
      }
    });
  }

  /**
   * Update preload statistics
   */
  private updatePreloadStats(success: boolean): void {
    const currentStats = this.preloadStats.value;
    this.preloadStats.next({
      ...currentStats,
      totalPreloaded: currentStats.totalPreloaded + 1,
      successfulPreloads: success ? currentStats.successfulPreloads + 1 : currentStats.successfulPreloads,
      failedPreloads: success ? currentStats.failedPreloads : currentStats.failedPreloads + 1
    });
  }

  /**
   * Get preload statistics
   */
  getPreloadStats(): Observable<PreloadStats> {
    return this.preloadStats.asObservable();
  }

  /**
   * Get current configuration
   */
  getConfig(): CacheOptimizationConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<CacheOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    // Configuration updated - no need to log every config update
  }

  /**
   * Force immediate preload
   */
  forcePreload(): void {
    this.performAutoPreload();
  }

  /**
   * Clear preload queue
   */
  clearPreloadQueue(): void {
    this.preloadQueue.clear();
    // Preload queue cleared - no need to log every queue clear
  }

  /**
   * Get queue status
   */
  getQueueStatus(): { isPreloading: boolean; queueSize: number } {
    return {
      isPreloading: this.isPreloading,
      queueSize: this.preloadQueue.size
    };
  }
} 