import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MediaCacheService, MediaCacheOptions } from '../../services/media-cache.service';
import { ConnectionQualityService } from '../../services/connection-quality.service';
import { LogService, LevelLogEnum } from '../../services/core-apis/log.service';
import { ImageService, ImageLoadOptions } from '../../services/image.service';

@Component({
  selector: 'worky-optimized-image',
  template: `
    <div class="image-container" [class.loading]="isLoading" [class.error]="hasError">
      <!-- Skeleton while loading -->
      <div *ngIf="isLoading && !hasError" class="image-skeleton">
        <div 
          class="skeleton-placeholder animate-pulse"
          [style.width]="skeletonWidth"
          [style.height]="skeletonHeight"
          [class.rounded-lg]="skeletonRounded">
          <div class="w-full h-full bg-gray-200 rounded-lg dark:bg-gray-700 flex items-center justify-center">
            <svg class="w-8 h-8 text-gray-300 dark:text-gray-600" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 18">
              <path d="M18 0H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm-5.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4.376 10.481A1 1 0 0 1 16 15H4a1 1 0 0 1-.895-1.447l3.5-7A1 1 0 0 1 7.468 6a.965.965 0 0 1 .9.5l2.775 4.757 1.546-1.887a1 1 0 0 1 1.618.1l2.541 4a1 1 0 0 1 .028 1.011Z"/>
            </svg>
          </div>
        </div>
        <div class="loading-text" *ngIf="isSlowConnection">
          <small>Loading on slow connection...</small>
        </div>
      </div>
      
      <!-- Real image - hidden until fully loaded -->
      <img
        *ngIf="!hasError && !isLoading && imageFullyLoaded"
        [src]="imageUrl"
        [alt]="alt"
        [class.loaded]="!isLoading"
        [class.low-quality]="isLowQuality"
        (load)="onImageLoad()"
        (error)="onImageError()"
        [loading]="lazy ? 'lazy' : 'eager'"
      />
      
      <!-- Hidden image for preloading -->
      <img
        *ngIf="!hasError && !imageFullyLoaded"
        [src]="imageUrl"
        [alt]="alt"
        [class.loaded]="!isLoading"
        [class.low-quality]="isLowQuality"
        (load)="onImageLoad()"
        (error)="onImageError()"
        [loading]="lazy ? 'lazy' : 'eager'"
        style="position: absolute; opacity: 0; pointer-events: none;"
      />
      
      <div class="error-placeholder" *ngIf="hasError">
        <i class="material-icons">image</i>
        <span class="error-text">Image not available</span>
        <button *ngIf="canRetry" (click)="retryLoad()" class="retry-button">
          <i class="material-icons">refresh</i>
          Retry
        </button>
      </div>

      <div class="quality-indicator" *ngIf="showQualityIndicator && isLowQuality">
        <i class="material-icons">signal_cellular_alt</i>
        <span>Data saving mode</span>
      </div>
    </div>
  `,
  styleUrls: ['./optimized-image.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule]
})
export class OptimizedImageComponent implements OnInit, OnDestroy {
  @Input() src!: string;
  @Input() alt: string = '';
  @Input() options: MediaCacheOptions = {};
  @Input() lazy: boolean = true;
  @Input() showQualityIndicator: boolean = true;
  @Input() fallbackSrc: string = '/assets/img/shared/handleImageError.png';
  @Input() skeletonWidth: string = '100%';
  @Input() skeletonHeight: string = '200px';
  @Input() skeletonRounded: boolean = true;
  @Input() maxRetries: number = 3;

  imageUrl: string = '';
  isLoading: boolean = true;
  hasError: boolean = false;
  isLowQuality: boolean = false;
  isSlowConnection: boolean = false;
  canRetry: boolean = false;
  retryCount: number = 0;
  imageFullyLoaded: boolean = false; // Track when image is fully loaded

  private destroy$ = new Subject<void>();

  constructor(
    private mediaCacheService: MediaCacheService,
    private connectionQualityService: ConnectionQualityService,
    private imageService: ImageService,
    private logService: LogService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this.src) {
      this.setError();
      return;
    }

    this.setupConnectionMonitoring();
    this.loadImage();
  }

  private setupConnectionMonitoring(): void {
    this.connectionQualityService.getConnectionQuality().pipe(
      takeUntil(this.destroy$)
    ).subscribe(quality => {
      this.isSlowConnection = quality === 'slow';
      this.isLowQuality = quality === 'slow';
      this.cdr.markForCheck();
    });
  }

  private loadImage(): void {
    this.isLoading = true;
    this.hasError = false;
    this.canRetry = false;
    this.imageFullyLoaded = false; // Reset fully loaded flag
    this.cdr.markForCheck();

    const connectionOptions = this.connectionQualityService.getOptimizedMediaOptions();
    const finalOptions: MediaCacheOptions = {
      ...connectionOptions,
      ...this.options
    };

    const qualityMap = { low: 'slow', medium: 'medium', high: 'fast' } as const;
    const optimizedUrl = this.mediaCacheService.getOptimizedUrl(this.src, qualityMap[connectionOptions.quality]);

    // Use improved image service
    const imageOptions: ImageLoadOptions = {
      maxRetries: this.maxRetries,
      retryDelay: 1000,
      fallbackUrl: this.fallbackSrc,
      timeout: 15000,
      showSkeleton: true
    };

    this.imageService.loadImageWithSkeleton(optimizedUrl, imageOptions).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (result) => {
        if (result.success) {
          this.imageUrl = result.url;
          // Don't set isLoading to false here - wait for onImageLoad
          this.hasError = false;
          this.isLowQuality = finalOptions.quality === 'low';
          this.retryCount = 0;
          this.cdr.markForCheck();

          this.logService.log(LevelLogEnum.INFO, 'OptimizedImageComponent', 'Image loaded successfully', {
            originalUrl: this.src,
            optimizedUrl,
            quality: finalOptions.quality,
            connectionQuality: this.connectionQualityService.getConnectionInfo().quality
          });
        } else {
          this.setError();
        }
      },
      error: (error) => {
        this.logService.log(LevelLogEnum.ERROR, 'OptimizedImageComponent', 'Failed to load image', {
          url: this.src,
          error: error.message,
          retryCount: this.retryCount
        });

        this.setError();
      }
    });
  }

  retryLoad(): void {
    if (this.canRetry) {
      this.retryCount = 0;
      this.loadImage();
    }
  }

  private setError(): void {
    this.imageUrl = this.fallbackSrc;
    this.isLoading = false;
    this.hasError = true;
    this.imageFullyLoaded = false;
    this.canRetry = this.retryCount < this.maxRetries;
    this.cdr.markForCheck();
  }

  onImageLoad(): void {
    // Only hide skeleton when image is fully loaded and ready to display
    this.isLoading = false;
    this.hasError = false;
    this.imageFullyLoaded = true; // Mark as fully loaded
    this.retryCount = 0;
    this.cdr.markForCheck();
  }

  onImageError(): void {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.loadImage();
    } else {
      this.setError();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
} 