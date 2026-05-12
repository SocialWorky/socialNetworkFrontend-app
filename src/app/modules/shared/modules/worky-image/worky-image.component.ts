import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { UtilityService } from '@shared/services/utility.service';
import { ImageService, ImageLoadOptions } from '@shared/services/image.service';
import { MobileImageCacheService } from '@shared/services/mobile-image-cache.service';
import { CommonModule } from '@angular/common';
import { environment } from '@env/environment';
import { ImageSkeletonComponent } from '@shared/components/skeleton/image-skeleton.component';

@Component({
  selector: 'worky-image',
  template: `
    <div class="worky-image-container" [class.loading]="isLoading" [class.error]="hasError">
      <!-- Skeleton while loading -->
      <worky-image-skeleton
        *ngIf="isLoading && !hasError"
        [width]="skeletonWidth"
        [height]="skeletonHeight"
        [rounded]="skeletonRounded"
        [mediaType]="mediaType">
      </worky-image-skeleton>
      
      <!-- Real image - hidden until fully loaded -->
      <img 
        *ngIf="!hasError && !isLoading && imageFullyLoaded"
        [src]="currentSrc" 
        [alt]="alt"
        [class]="cssClass"
        (load)="onImageLoad()"
        (error)="onImageError()"
        (click)="onImageClick($event)"
      />
      
      <!-- Hidden image for preloading -->
      <img 
        *ngIf="!hasError && !imageFullyLoaded"
        [src]="currentSrc" 
        [alt]="alt"
        [class]="cssClass"
        (load)="onImageLoad()"
        (error)="onImageError()"
        style="position: absolute; opacity: 0; pointer-events: none;"
      />
      
      <!-- Error placeholder only when there's a real error -->
      <div *ngIf="hasError" class="image-error">
        <i class="material-icons">image</i>
        <span class="error-text">Image not available</span>
        <button *ngIf="canRetry" (click)="retryLoad()" class="retry-button">
          <i class="material-icons">refresh</i>
          Retry
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./worky-image.component.scss'],
  standalone: true,
  imports: [CommonModule, ImageSkeletonComponent]
})
export class WorkyImageComponent implements OnInit, OnDestroy, OnChanges {
  @Input() src: string = '';
  @Input() fallbackSrc: string = 'assets/img/shared/handleImageError.png';
  @Input() alt: string = '';
  @Input() cssClass: string = '';
  @Input() skeletonWidth: string = '100%';
  @Input() skeletonHeight: string = '200px';
  @Input() skeletonRounded: boolean = true;
  @Input() loadingTimeout: number = 10000; // 10 seconds timeout
  @Input() maxRetries: number = 2;
  @Input() priority: 'high' | 'medium' | 'low' = 'medium';
  @Input() publicationId?: string | null; // Context for error logging
  @Input() commentId?: string | null; // Context for error logging
  @Input() mediaId?: string | null; // Context for error logging
  @Input() imageType: 'profile' | 'publication' | 'media' = 'media';
  @Input() mediaType: 'image' | 'video' = 'image';
  @Output() imageClick = new EventEmitter<MouseEvent>();

  currentSrc: string = '';
  isLoading: boolean = true;
  hasError: boolean = false;
  canRetry: boolean = false;
  imageFullyLoaded: boolean = false; // Track when image is fully loaded
  private retryCount: number = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private _utilityService: UtilityService,
    private _imageService: ImageService,
    private _mobileCacheService: MobileImageCacheService,
    private _cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadImage();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['src'] && !changes['src'].firstChange) {
      this.loadImage();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadImage(): void {
    if (!this.src) {
      this.setError();
      return;
    }

    this.isLoading = true;
    this.hasError = false;
    this.canRetry = false;
    this.imageFullyLoaded = false; // Reset fully loaded flag
    this._cdr.markForCheck();

    // Normalize image URL if it's a relative path (not starting with http/https)
    const normalizedSrc = this._utilityService.normalizeImageUrl(
      this.src, 
      environment.MINIO_BUCKET_URL || ''
    );

    // Use mobile-optimized cache service if available
    const imageService = this._mobileCacheService.isMobile() ? this._mobileCacheService : this._imageService;

    const options: ImageLoadOptions = {
      maxRetries: this.maxRetries,
      retryDelay: 1000,
      fallbackUrl: this.fallbackSrc,
      timeout: this.loadingTimeout,
      showSkeleton: true,
      useServiceWorkerCache: true,
      priority: this.priority
    };

    // Add context IDs to options for error logging (cast to any to allow dynamic properties)
    const optionsWithContext = {
      ...options,
      publicationId: this.publicationId || undefined,
      commentId: this.commentId || undefined,
      mediaId: this.mediaId || undefined
    } as any;

    // Use the appropriate service for loading
    // Use the provided imageType or default to 'media'
    const finalImageType = this.imageType || 'media';
    const imageObservable = this._mobileCacheService.isMobile() 
      ? this._mobileCacheService.loadImage(normalizedSrc, finalImageType, optionsWithContext)
      : this._imageService.loadImage(normalizedSrc, optionsWithContext);

    imageObservable
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (url: string) => {
          this.currentSrc = url;
          // Don't set isLoading to false here - wait for onImageLoad
          this.hasError = false;
          this.retryCount = 0;
          this._cdr.markForCheck();
        },
        error: (error: any) => {
          // Log 404 errors with detailed information
          if (error?.status === 404 || error?.message?.includes('404') || error?.message?.includes('Not Found')) {
            // Try to get LogService if available (inject it if not already)
            // For now, we'll log to console as fallback
            console.error('[WorkyImageComponent] Image not found (404):', {
              originalSrc: this.src,
              normalizedSrc: normalizedSrc,
              errorStatus: error?.status,
              errorMessage: error?.message,
              timestamp: new Date().toISOString()
            });
          }
          this.setError();
        }
      });
  }

  private setError(): void {
    this.currentSrc = this.fallbackSrc;
    this.isLoading = false;
    this.hasError = true;
    this.imageFullyLoaded = false;
    this.canRetry = this.retryCount < this.maxRetries;
    this._cdr.markForCheck();
  }

  retryLoad(): void {
    if (this.canRetry) {
      this.retryCount = 0;
      this.loadImage();
    }
  }

  onImageLoad(): void {
    // Only hide skeleton when image is fully loaded and ready to display
    this.isLoading = false;
    this.hasError = false;
    this.imageFullyLoaded = true; // Mark as fully loaded
    this.retryCount = 0;
    this._cdr.markForCheck();
  }

  onImageError(): void {
    // Only show error if retries are exhausted
    if (this.retryCount >= this.maxRetries) {
      this.setError();
    } else {
      // Retry automatically
      this.retryCount++;
      this.loadImage();
    }
  }

  onImageClick(event: MouseEvent): void {
    this.imageClick.emit(event);
  }
} 