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
    preloadInterval: 30, // 30 minutes
    maxImagesPerBatch: 20,
    preloadThreshold: 1000 // 1Mbps
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
    this.initializeAutoPreload();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

    // Initial preload after 5 seconds
    setTimeout(() => {
      this.performAutoPreload();
    }, 5000);
  }

  /**
   * Perform automatic preloading of important images
   */
  private async performAutoPreload(): Promise<void> {
    if (this.isPreloading) return;

    this.isPreloading = true;
    this.logService.log(LevelLogEnum.INFO, 'CacheOptimizationService', 'Starting auto preload');

    try {
      // Get recent publications
      const publications = await this.publicationDatabase.getAllPublications();
      const recentPublications = publications.slice(0, 10); // Last 10 publications

      const imageUrls: string[] = [];

      // Collect profile images from recent publications
      recentPublications.forEach(pub => {
        if (pub.author?.avatar) {
          imageUrls.push(pub.author.avatar);
        }
      });

      // Collect publication images
      recentPublications.forEach(pub => {
        if (pub.media && pub.media.length > 0) {
          pub.media.forEach(media => {
            if (media.type === 'image' && media.urlCompressed) {
              imageUrls.push(media.urlCompressed);
            }
          });
        }
      });

      // Remove duplicates and limit batch size
      const uniqueUrls = [...new Set(imageUrls)].slice(0, this.config.maxImagesPerBatch);

      if (uniqueUrls.length > 0) {
        this.preloadImages(uniqueUrls);
      }

      // Update stats
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
            this.logService.log(LevelLogEnum.DEBUG, 'CacheOptimizationService', 'Image preloaded', { url });
          },
          error: (error) => {
            this.preloadQueue.delete(url);
            this.updatePreloadStats(false);
            this.logService.log(LevelLogEnum.WARN, 'CacheOptimizationService', 'Image preload failed', { url, error });
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
    this.logService.log(LevelLogEnum.INFO, 'CacheOptimizationService', 'Configuration updated', { config: this.config });
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
    this.logService.log(LevelLogEnum.INFO, 'CacheOptimizationService', 'Preload queue cleared');
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