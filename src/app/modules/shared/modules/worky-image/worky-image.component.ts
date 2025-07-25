import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { UtilityService } from '@shared/services/utility.service';
import { ImageService, ImageLoadOptions } from '@shared/services/image.service';
import { MobileImageCacheService } from '@shared/services/mobile-image-cache.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'worky-image',
  template: `
    <div class="worky-image-container" [class.loading]="isLoading" [class.error]="hasError">
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
      </div>
      
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
  imports: [CommonModule]
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

    // Use the appropriate service for loading
    const imageObservable = this._mobileCacheService.isMobile() 
      ? this._mobileCacheService.loadImage(this.src, 'media', options)
      : this._imageService.loadImage(this.src, options);

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