import { ChangeDetectionStrategy, Component, Input, OnInit, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ImageOrganizer, MediaType } from './interfaces/image-organizer.interface';
import { environment } from '@env/environment';
import { MediaViewComponent } from './components/media-view/media-view.component';
import { PublicationView, Comment } from '@shared/interfaces/publicationView.interface';
import { DeviceDetectionService } from '@shared/services/device-detection.service';
import { UtilityService } from '@shared/services/utility.service';
import { PreloadService } from '@shared/services/preload.service';
import { ImageLoadingService } from '@shared/services/image-loading.service';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { MobileImageCacheService } from '@shared/services/mobile-image-cache.service';

@Component({
    selector: 'worky-image-organizer',
    templateUrl: './image-organizer.component.html',
    styleUrls: ['./image-organizer.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class ImageOrganizerComponent implements OnInit {

  @Input() publication?: PublicationView;

  @Input() type = 'publication';

  @Input() comment?: Comment;

  @Input() isLoading: boolean = false;

  @Output() load = new EventEmitter<void>();
  @Output() error = new EventEmitter<Event>();

  images: ImageOrganizer[] = [];

  galleryItems: any[] = [];

  urlMediaApi = environment.MINIO_BUCKET_URL;

  lightboxOpen = false;

  currentItem: any = null;

  get isMobile(): boolean {
    return this._deviceDetectionService.isMobile();
  }

  get isIphone(): boolean {
    return this._deviceDetectionService.isIphone();
  }

  constructor(
    private _dialog: MatDialog,
    private _deviceDetectionService: DeviceDetectionService,
    private _utilityService: UtilityService,
    private _preloadService: PreloadService,
    private _imageLoadingService: ImageLoadingService,
    private _logService: LogService,
    private _mobileImageCacheService: MobileImageCacheService
  ) { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges) {
    if(this.type === 'publication') {
      this.images = this.publication ? [...this.publication.media] : [];
    } else if(this.type === 'comment') {
      this.images = this.comment ? [...this.comment.media] : [];
    }


    this.galleryItems = this.images.map(image => {
      if (this.isImageUrl(image.urlCompressed)) {
        const normalized = this._utilityService.normalizeImageUrl(image.urlCompressed, this.urlMediaApi);
        return {
          src: normalized,
          isImage: true,
          isVideo: false
        };
      } else if (this.isVideoUrl(image.url)) {
        const normalized = this._utilityService.normalizeImageUrl(image.url, this.urlMediaApi);
        return {
          src: normalized,
          isImage: false,
          isVideo: true
        };
      } else {
        return null;
      }
    }).filter(item => item !== null);

    this.images.map(image => {
      image.type = this.isImageUrl(image.url) ? MediaType.IMAGE : MediaType.VIDEO;
    });

    this.preloadMedia();
  }

  isImageUrl(url: string): boolean {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  }

  isVideoUrl(url: string): boolean {
    return /\.(mp4|ogg|webm|avi|mov)$/i.test(url);
  }

  /**
   * Get normalized image URL for display
   */
  getNormalizedImageUrl(url: string): string {
    if (!url) return '';
    return this._utilityService.normalizeImageUrl(url, this.urlMediaApi);
  }

  onImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    const failedImageUrl = imgElement.src;
    
    // Extract original URL before normalization if possible
    const originalUrl = failedImageUrl;
    
    // Try to extract publication ID from URL if not available
    let publicationIdFromUrl: string | null = null;
    if (!this.publication?._id && originalUrl.includes('/publications/')) {
      // Try to extract publication ID from URL pattern
      // Pattern: .../publications/{userId}|{timestamp}-{filename}
      // We can't reliably extract publicationId from URL, but we can log the URL pattern
      const urlMatch = originalUrl.match(/publications\/([^\/\?]+)/);
      if (urlMatch && urlMatch[1]) {
        publicationIdFromUrl = urlMatch[1].split('|')[0]; // Get userId part before |
      }
    }
    
    // Clear invalid image from cache when 404 is detected
    // This prevents stale cache entries from causing repeated 404 errors
    this._mobileImageCacheService.clearImageFromCache(originalUrl).catch(clearError => {
      // Log cache clear error but don't block the main error logging
      this._logService.log(
        LevelLogEnum.WARN,
        'ImageOrganizerComponent',
        'Failed to clear invalid image from cache',
        { imageUrl: originalUrl, clearError: String(clearError) }
      );
    });
    
    // Log detailed error information including publication/comment context
    this._logService.log(
      LevelLogEnum.ERROR,
      'ImageOrganizerComponent',
      'Image failed to load (404 or other error) - Image may have been deleted from storage. Cache cleared.',
      {
        failedImageUrl: originalUrl,
        type: this.type,
        publicationId: this.publication?._id || publicationIdFromUrl || null,
        publicationAuthor: this.publication?.author ? `${this.publication.author.name} ${this.publication.author.lastName}` : null,
        commentId: this.comment?._id || null,
        commentAuthor: this.comment?.author ? `${this.comment.author.name} ${this.comment.author.lastName}` : null,
        imagesCount: this.images.length,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        cacheCleared: true
      }
    );
    
    this._utilityService.handleImageError(event, 'assets/img/shared/handleImageError.png');
    this.error.emit(event);
  }

  onImageLoad(): void {
    this.load.emit();
  }

  private preloadMedia(): void {
    if (this.images.length === 0) return;

    // Get context IDs for error logging
    const publicationId = this.publication?._id;
    const commentId = this.comment?._id;

    const imageUrls = this.images
      .filter(image => this.isImageUrl(image.urlCompressed))
      .map(image => this._utilityService.normalizeImageUrl(image.urlCompressed, this.urlMediaApi))
      .filter((url): url is string => url !== null && url.length > 0);

    const videoUrls = this.images
      .filter(image => this.isVideoUrl(image.url))
      .map(image => this._utilityService.normalizeImageUrl(image.url, this.urlMediaApi))
      .filter((url): url is string => url !== null && url.length > 0);

    // Use MobileImageCacheService for optimized image loading with context
    if (imageUrls.length > 0) {
      imageUrls.forEach((imageUrl, index) => {
        const mediaId = this.images[index]?._id;
        // Use MobileImageCacheService which supports context for error logging
        this._mobileImageCacheService.loadImage(imageUrl, this.type === 'publication' ? 'publication' : 'media', {
          timeout: 10000,
          maxRetries: 2,
          retryDelay: 1000,
          priority: 'low',
          publicationId: publicationId || undefined,
          commentId: commentId || undefined,
          mediaId: mediaId || undefined
        } as any).subscribe({
          next: () => {
            // Image loaded successfully - no logging needed
          },
          error: (error) => {
            // Error handled by MobileImageCacheService with context logging
          }
        });
      });
    }

    // Use PreloadService for videos (keep existing logic)
    if (videoUrls.length > 0) {
      setTimeout(() => {
        this._preloadService.addToPreloadQueue(videoUrls);
      }, 500);
    }
  }

  openLightbox(index: number): void {
    this.currentItem = this.galleryItems[index];
    this.lightboxOpen = true;
  }

  closeLightbox(): void {
    this.lightboxOpen = false;
    this.currentItem = null;
  }

  private resetIOSViewport(): void {
    if (!this.isIphone) return;

    const resetStyles = (element: HTMLElement) => {
      element.style.padding = '0';
      element.style.margin = '0';
      element.style.top = '0';
      element.style.position = '';
      element.style.height = '';
      element.style.overflow = '';
      element.style.transform = '';
    };

    [document.body, document.documentElement].forEach(resetStyles);
    
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    
    // Doble reset para asegurar que se aplique
    setTimeout(() => {
      [document.body, document.documentElement].forEach(resetStyles);
      window.scrollTo(0, 0);
    }, 50);
  }

  openViewMedia(imagenSelected: ImageOrganizer): void {
    const dialogConfig: MatDialogConfig = {
      width: this.isIphone ? '100vw' : (this.isMobile ? '100dvw' : '95dvw'),
      height: this.isIphone ? '100vh' : (this.isMobile ? '100dvh' : '95dvh'),
      maxWidth: this.isIphone ? '100vw' : (this.isMobile ? '100dvw' : '95dvw'),
      maxHeight: this.isIphone ? '100vh' : (this.isMobile ? '100dvh' : '95dvh'),
      panelClass: 'view-media-modal-container',
      disableClose: this.isIphone,
      data: {
        images: this.images,
        imageSelected: imagenSelected,
        comment: this.comment,
        publication: this.publication,
        type: this.type
      }
    };

    if (this.isIphone) {
      dialogConfig.position = { top: '0px' };
    }

    const dialogRef = this._dialog.open(MediaViewComponent, dialogConfig);

    dialogRef.afterClosed().subscribe(result => {
      if (this.isIphone) {
        this.resetIOSViewport();
      }
      
      if (result) {
        // Your existing logic here
      }
    });
  }
}
