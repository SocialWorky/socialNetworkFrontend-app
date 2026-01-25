import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, of, firstValueFrom } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { LogService, LevelLogEnum } from './core-apis/log.service';
import { MobileImageCacheService } from './mobile-image-cache.service';
import { PublicationDatabaseService } from './database/publication-database.service';
import { UtilityService } from './utility.service';
import { environment } from '@env/environment';

export interface PreloadStrategy {
  profileImages: boolean;
  publicationImages: boolean;
  mediaImages: boolean;
  priority: 'high' | 'medium' | 'low';
  maxImages: number;
}

export interface PreloadResult {
  success: number;
  failed: number;
  total: number;
  duration: number;
}

@Injectable({
  providedIn: 'root'
})
export class ImagePreloadService {
  private readonly DEFAULT_STRATEGY: PreloadStrategy = {
    profileImages: true,
    publicationImages: true,
    mediaImages: false,
    priority: 'medium',
    maxImages: 20
  };

  private preloadQueue = new Set<string>();
  private isPreloading = false;
  private preloadResults = new BehaviorSubject<PreloadResult>({
    success: 0,
    failed: 0,
    total: 0,
    duration: 0
  });

  constructor(
    private mobileImageCache: MobileImageCacheService,
    private publicationDatabase: PublicationDatabaseService,
    private logService: LogService,
    private utilityService: UtilityService
  ) {}

  /**
   * Preload images based on current user activity and data
   */
  async preloadImages(strategy: Partial<PreloadStrategy> = {}): Promise<PreloadResult> {
    const finalStrategy = { ...this.DEFAULT_STRATEGY, ...strategy };
    const startTime = Date.now();

    if (this.isPreloading) {

      return this.preloadResults.value;
    }

    this.isPreloading = true;
    this.preloadResults.next({
      success: 0,
      failed: 0,
      total: 0,
      duration: 0
    });

    try {
      const imageUrls: string[] = [];

      // Get profile images
      if (finalStrategy.profileImages) {
        const profileImages = await this.getProfileImages();
        imageUrls.push(...profileImages.slice(0, finalStrategy.maxImages / 2));
      }

      // Get publication images
      if (finalStrategy.publicationImages) {
        const publicationImages = await this.getPublicationImages();
        imageUrls.push(...publicationImages.slice(0, finalStrategy.maxImages / 2));
      }

      // Get media images
      if (finalStrategy.mediaImages) {
        const mediaImages = await this.getMediaImages();
        imageUrls.push(...mediaImages.slice(0, finalStrategy.maxImages));
      }

      // Remove duplicates and limit total
      const uniqueUrls = [...new Set(imageUrls)].slice(0, finalStrategy.maxImages);

      // Starting image preload - no need to log every preload operation

      // Preload images
      const results = await this.preloadImageBatch(uniqueUrls, finalStrategy.priority);

      const duration = Date.now() - startTime;
      const result: PreloadResult = {
        success: results.success,
        failed: results.failed,
        total: uniqueUrls.length,
        duration
      };

      this.preloadResults.next(result);

      // Preload completed - no need to log every preload completion

      return result;

    } catch (error) {
      this.logService.log(LevelLogEnum.ERROR, 'ImagePreloadService', 'Preload failed', { error });
      throw error;
    } finally {
      this.isPreloading = false;
    }
  }

  /**
   * Preload specific image URLs
   */
  preloadSpecificImages(imageUrls: string[], imageType: 'profile' | 'publication' | 'media' = 'media'): void {
    if (imageUrls.length === 0) return;

    // Preloading specific images - no need to log every preload operation

    imageUrls.forEach(url => {
      // Normalize URL before using it
      const normalizedUrl = this.utilityService.normalizeImageUrl(url, environment.MINIO_BUCKET_URL || '');
      if (!this.preloadQueue.has(normalizedUrl)) {
        this.preloadQueue.add(normalizedUrl);
        
        this.mobileImageCache.loadImage(normalizedUrl, imageType, { priority: 'low' }).subscribe({
          next: () => {
            this.preloadQueue.delete(normalizedUrl);
            // Image preloaded - no need to log every preload
          },
          error: (error) => {
            this.preloadQueue.delete(normalizedUrl);

          }
        });
      }
    });
  }

  /**
   * Get preload results
   */
  getPreloadResults(): Observable<PreloadResult> {
    return this.preloadResults.asObservable();
  }

  /**
   * Check if preload is in progress
   */
  isPreloadingInProgress(): boolean {
    return this.isPreloading;
  }

  /**
   * Get profile images from recent publications
   */
  private async getProfileImages(): Promise<string[]> {
    try {
      const publications = await this.publicationDatabase.getAllPublications();
      const profileImages = new Set<string>();

      publications.forEach(pub => {
        if (pub.author?.avatar) {
          // Normalize URL before adding
          const normalizedUrl = this.utilityService.normalizeImageUrl(pub.author.avatar, environment.MINIO_BUCKET_URL || '');
          profileImages.add(normalizedUrl);
        }
      });

      return Array.from(profileImages);
    } catch (error) {
      this.logService.log(LevelLogEnum.ERROR, 'ImagePreloadService', 'Failed to get profile images', { error });
      return [];
    }
  }

  /**
   * Get publication images
   */
  private async getPublicationImages(): Promise<string[]> {
    try {
      const publications = await this.publicationDatabase.getAllPublications();
      const publicationImages: string[] = [];

      publications.forEach(pub => {
        if (pub.media && pub.media.length > 0) {
          pub.media.forEach(media => {
            if (media.type === 'image' && media.url) {
              // Normalize URL before adding
              const normalizedUrl = this.utilityService.normalizeImageUrl(media.url, environment.MINIO_BUCKET_URL || '');
              publicationImages.push(normalizedUrl);
            }
          });
        }
      });

      // Sort by recency (assuming publications are already sorted)
      return publicationImages;
    } catch (error) {
      this.logService.log(LevelLogEnum.ERROR, 'ImagePreloadService', 'Failed to get publication images', { error });
      return [];
    }
  }

  /**
   * Get media images
   */
  private async getMediaImages(): Promise<string[]> {
    try {
      const publications = await this.publicationDatabase.getAllPublications();
      const mediaImages: string[] = [];

      publications.forEach(pub => {
        if (pub.media && pub.media.length > 0) {
          pub.media.forEach(media => {
            if (media.type === 'image' && media.url) {
              // Normalize URL before adding
              const normalizedUrl = this.utilityService.normalizeImageUrl(media.url, environment.MINIO_BUCKET_URL || '');
              mediaImages.push(normalizedUrl);
            }
          });
        }
      });

      return mediaImages;
    } catch (error) {
      this.logService.log(LevelLogEnum.ERROR, 'ImagePreloadService', 'Failed to get media images', { error });
      return [];
    }
  }

  /**
   * Preload a batch of images
   */
  private async preloadImageBatch(imageUrls: string[], priority: 'high' | 'medium' | 'low'): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    const promises = imageUrls.map(async url => {
      try {
        // URL should already be normalized, but ensure it is
        const normalizedUrl = this.utilityService.normalizeImageUrl(url, environment.MINIO_BUCKET_URL || '');
        await firstValueFrom(this.mobileImageCache.loadImage(normalizedUrl, 'media', { priority }));
        success++;
        // Image preloaded successfully - no need to log every preload
      } catch (error) {
        failed++;

      }
    });

    await Promise.all(promises);

    return { success, failed };
  }

  /**
   * Preload images for a specific user
   */
  preloadUserImages(userId: string, avatar?: string): void {
    const imagesToPreload: string[] = [];

    if (avatar) {
      // Normalize URL before adding
      const normalizedUrl = this.utilityService.normalizeImageUrl(avatar, environment.MINIO_BUCKET_URL || '');
      imagesToPreload.push(normalizedUrl);
    }

    if (imagesToPreload.length > 0) {
      this.preloadSpecificImages(imagesToPreload, 'profile');
    }
  }

  /**
   * Preload images for a specific publication
   */
  preloadPublicationImages(publication: any): void {
    const imagesToPreload: string[] = [];

    if (publication.media && publication.media.length > 0) {
      publication.media.forEach((media: any) => {
        if (media.type === 'image' && media.url) {
          // Normalize URL before adding
          const normalizedUrl = this.utilityService.normalizeImageUrl(media.url, environment.MINIO_BUCKET_URL || '');
          imagesToPreload.push(normalizedUrl);
        }
      });
    }

    if (imagesToPreload.length > 0) {
      this.preloadSpecificImages(imagesToPreload, 'publication');
    }
  }

  /**
   * Clear preload queue
   */
  clearPreloadQueue(): void {
    this.preloadQueue.clear();
    // Preload queue cleared - no need to log every queue clear
  }

  /**
   * Get preload queue status
   */
  getPreloadQueueStatus(): { size: number; isActive: boolean } {
    return {
      size: this.preloadQueue.size,
      isActive: this.isPreloading
    };
  }
} 