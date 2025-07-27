import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { MobileImageCacheService } from '@shared/services/mobile-image-cache.service';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { TranslationsModule } from '@shared/modules/translations/translations.module';

export interface OptimizedImageOptions {
  type?: 'profile' | 'publication' | 'media';
  fallbackUrl?: string;
  showSkeleton?: boolean;
  lazyLoad?: boolean;
  priority?: 'high' | 'medium' | 'low';
  quality?: 'low' | 'medium' | 'high';
}

@Component({
  selector: 'worky-optimized-image',
  standalone: true,
  imports: [CommonModule, TranslationsModule],
  template: `
    <div class="optimized-image-container" [class.loading]="isLoading" [class.error]="hasError">
      <!-- Skeleton loader -->
      <div *ngIf="showSkeleton && isLoading" class="image-skeleton">
        <div class="skeleton-placeholder"></div>
      </div>

      <!-- Error placeholder -->
      <div *ngIf="hasError" class="image-error">
        <i class="fas fa-image"></i>
        <span>{{ 'common.imageError' | workyTranslations }}</span>
      </div>

      <!-- Actual image -->
      <img 
        #imageElement
        [src]="imageSrc" 
        [alt]="alt"
        [class.loaded]="!isLoading && !hasError"
        [class.lazy]="lazyLoad"
        (load)="onImageLoad()"
        (error)="onImageError()"
        [style.display]="isLoading || hasError ? 'none' : 'block'"
        loading="{{ lazyLoad ? 'lazy' : 'eager' }}"
        decoding="async">
    </div>
  `,
  styles: [`
    .optimized-image-container {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: var(--worky-background-color, #f8f9fa);
      border-radius: 8px;
    }

    .optimized-image-container.loading {
      background: var(--worky-skeleton-color, #e9ecef);
    }

    .optimized-image-container.error {
      background: var(--worky-error-background, #f8d7da);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      color: var(--worky-error-color, #721c24);
    }

    .image-skeleton {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .skeleton-placeholder {
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: skeleton-loading 1.5s infinite;
      border-radius: 8px;
    }

    @keyframes skeleton-loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .image-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      text-align: center;
    }

    .image-error i {
      font-size: 2rem;
      margin-bottom: 8px;
      opacity: 0.6;
    }

    .image-error span {
      font-size: 0.875rem;
      opacity: 0.8;
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 8px;
      transition: opacity 0.3s ease;
      opacity: 0;
    }

    img.loaded {
      opacity: 1;
    }

    img.lazy {
      opacity: 0;
    }

    img.lazy.loaded {
      opacity: 1;
    }

    /* Profile image specific styles */
    .optimized-image-container.profile-image {
      border-radius: 50%;
    }

    .optimized-image-container.profile-image img {
      border-radius: 50%;
    }

    .optimized-image-container.profile-image .skeleton-placeholder {
      border-radius: 50%;
    }

    /* Publication image specific styles */
    .optimized-image-container.publication-image {
      border-radius: 12px;
    }

    .optimized-image-container.publication-image img {
      border-radius: 12px;
    }

    .optimized-image-container.publication-image .skeleton-placeholder {
      border-radius: 12px;
    }

    /* Media image specific styles */
    .optimized-image-container.media-image {
      border-radius: 8px;
    }

    .optimized-image-container.media-image img {
      border-radius: 8px;
    }

    .optimized-image-container.media-image .skeleton-placeholder {
      border-radius: 8px;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .optimized-image-container {
        border-radius: 6px;
      }

      .optimized-image-container img {
        border-radius: 6px;
      }

      .optimized-image-container .skeleton-placeholder {
        border-radius: 6px;
      }
    }
  `]
})
export class OptimizedImageComponent implements OnInit, OnDestroy {
  @Input() src: string = '';
  @Input() alt: string = '';
  @Input() options: OptimizedImageOptions = {};
  @Input() width?: string;
  @Input() height?: string;
  @Input() type: 'profile' | 'publication' | 'media' = 'media';

  @ViewChild('imageElement', { static: false }) imageElement!: ElementRef<HTMLImageElement>;

  imageSrc: string = '';
  isLoading = true;
  hasError = false;
  showSkeleton = true;
  lazyLoad = true;

  private destroy$ = new Subject<void>();
  private imageLoadTimeout: any;

  constructor(
    private mobileImageCache: MobileImageCacheService,
    private logService: LogService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeOptions();
    this.loadImage();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.imageLoadTimeout) {
      clearTimeout(this.imageLoadTimeout);
    }
  }

  private initializeOptions(): void {
    const defaultOptions: OptimizedImageOptions = {
      type: this.type,
      fallbackUrl: '/assets/img/shared/handleImageError.png',
      showSkeleton: true,
      lazyLoad: true,
      priority: 'medium',
      quality: 'medium'
    };

    this.options = { ...defaultOptions, ...this.options };
    this.showSkeleton = this.options.showSkeleton ?? true;
    this.lazyLoad = this.options.lazyLoad ?? true;
  }

  private loadImage(): void {
    if (!this.src) {
      this.handleError();
      return;
    }

    this.isLoading = true;
    this.hasError = false;
    this.cdr.markForCheck();

    // Set loading timeout
    this.imageLoadTimeout = setTimeout(() => {
      if (this.isLoading) {
        this.logService.log(LevelLogEnum.WARN, 'OptimizedImageComponent', 'Image load timeout', { src: this.src });
        this.handleError();
      }
    }, 30000); // 30 seconds timeout

    // Validate URL for Safari iOS
    if (this.isSafariIOS() && !this.src.startsWith('http')) {
      this.logService.log(LevelLogEnum.WARN, 'OptimizedImageComponent', 'Invalid image URL for Safari iOS', { src: this.src });
      this.handleError();
      return;
    }

    // Load image using mobile cache service
    this.mobileImageCache.loadImage(this.src, this.options.type || 'media', {
      priority: this.options.priority,
      timeout: 30000
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (cachedUrl) => {
        this.imageSrc = cachedUrl;
        this.isLoading = false;
        this.hasError = false;
        
        if (this.imageLoadTimeout) {
          clearTimeout(this.imageLoadTimeout);
        }
        
        this.cdr.markForCheck();
        
        // Image loaded successfully - no need to log every successful load
      },
      error: (error) => {
        this.logService.log(LevelLogEnum.ERROR, 'OptimizedImageComponent', 'Failed to load image', { 
          src: this.src, 
          error: error.message 
        });
        this.handleError();
      }
    });
  }

  private isSafariIOS(): boolean {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    return isIOS && isSafari;
  }

  onImageLoad(): void {
    this.isLoading = false;
    this.hasError = false;
    this.cdr.markForCheck();
  }

  onImageError(): void {
    this.logService.log(LevelLogEnum.WARN, 'OptimizedImageComponent', 'Image failed to load', { src: this.src });
    this.handleError();
  }

  private handleError(): void {
    this.isLoading = false;
    this.hasError = true;
    
    if (this.imageLoadTimeout) {
      clearTimeout(this.imageLoadTimeout);
    }
    
    // Try fallback URL if available
    if (this.options.fallbackUrl && this.imageSrc !== this.options.fallbackUrl) {
      // Trying fallback URL - no need to log every fallback attempt
      this.imageSrc = this.options.fallbackUrl;
      this.hasError = false;
      this.cdr.markForCheck();
    } else {
      this.cdr.markForCheck();
    }
  }

  /**
   * Reload the image (useful for retry functionality)
   */
  reload(): void {
    this.loadImage();
  }

  /**
   * Preload this image
   */
  preload(): void {
    if (this.src) {
      this.mobileImageCache.preloadImages([this.src], this.options.type || 'media', this.options.priority || 'medium');
    }
  }
} 