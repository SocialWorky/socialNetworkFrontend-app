import { Component, EventEmitter, Input, OnChanges, OnInit, Output, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ImageOrganizer } from '../../../interfaces/image-organizer.interface';
import { environment } from '@env/environment';
import { DeviceDetectionService } from '@shared/services/device-detection.service';
import { UtilityService } from '@shared/services/utility.service';
import { MobileImageCacheService } from '@shared/services/mobile-image-cache.service';

@Component({
    selector: 'worky-image-loading',
    templateUrl: './image-loading.component.html',
    styleUrls: ['./image-loading.component.scss'],
    standalone: false
})
export class ImageLoadingComponent implements OnInit, OnChanges, OnDestroy {
  get isMobile(): boolean {
    return this._deviceDetectionService.isMobile();
  }

  @Input() images: ImageOrganizer[] = [];

  @Input() imageSelected: ImageOrganizer | undefined;

  @Output() imageChanged = new EventEmitter<string>();

  currentIndex: number = 0;
  currentImage: ImageOrganizer | undefined;

  urlFilesService = environment.APIFILESERVICE;

  private destroy$ = new Subject<void>();

  constructor(
    private _deviceDetectionService: DeviceDetectionService,
    private _utilityService: UtilityService,
    private _cdr: ChangeDetectorRef,
    private _mobileCacheService: MobileImageCacheService
  ) { }

  ngOnInit(): void {
    // Preload all images in the modal for better performance
    this.preloadModalImages();
  }

  ngOnChanges(): void {
    this.updateSelectedImage();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  updateSelectedImage(): void {
    if (this.imageSelected && this.images.length) {
      const index = this.images.findIndex(img => img._id === this.imageSelected?._id);
      if (index !== -1) {
        this.currentIndex = index;
        this.currentImage = this.images[index];
      }
    } else if (this.images.length > 0) {
      this.currentImage = this.images[0];
    }
  }

  previousImage(): void {
    if (this.images.length) {
      this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
      const newImage = this.images[this.currentIndex];
      this.currentImage = newImage;
      this.imageChanged.emit(newImage._id);
      this._cdr.detectChanges();
    }
  }

  nextImage(): void {
    if (this.images.length) {
      this.currentIndex = (this.currentIndex + 1) % this.images.length;
      const newImage = this.images[this.currentIndex];
      this.currentImage = newImage;
      this.imageChanged.emit(newImage._id);
      this._cdr.detectChanges();
    }
  }

  selectImage(image: ImageOrganizer): void {
    this.currentIndex = this.images.findIndex(i => i._id === image._id);
    this.currentImage = image;
    this.imageChanged.emit(image._id);
    this._cdr.detectChanges();
  }

  openImage(image: ImageOrganizer): void {
    window.open(image.url, '_blank')?.focus();
  }

  isImage(): boolean {
    return this.currentImage?.type === 'image';
  }

  isVideo(): boolean {
    return this.currentImage?.type === 'video';
  }

  onImageError(event: Event): void {
    this._utilityService.handleImageError(event, 'assets/img/shared/handleImageError.png');
  }

  trackByImageId(index: number, image: ImageOrganizer): string {
    return image._id;
  }

  getImageUrl(image: ImageOrganizer | undefined, type: 'compressed' | 'thumbnail' = 'compressed'): string {
    if (!image) return '';
    const url = type === 'compressed' ? image.urlCompressed : image.urlThumbnail;
    if (!url) return '';
    
    return this._utilityService.normalizeImageUrl(url, this.urlFilesService);
  }

  getVideoUrl(image: ImageOrganizer | undefined): string {
    if (!image) return '';
    if (!image.urlCompressed) return '';
    
    return this._utilityService.normalizeImageUrl(image.urlCompressed, this.urlFilesService);
  }

  getVideoPosterUrl(image: ImageOrganizer | undefined): string {
    if (!image) return '';
    if (!image.urlThumbnail) return '';
    
    return this._utilityService.normalizeImageUrl(image.urlThumbnail, this.urlFilesService);
  }

  /**
   * Preload all images in the modal for better performance
   */
  private preloadModalImages(): void {
    if (!this._mobileCacheService.isMobile()) return;

    const imageUrls: string[] = [];

    // Collect all image URLs from the modal
    this.images.forEach(image => {
      if (image.type === 'image') {
        const compressedUrl = this.getImageUrl(image, 'compressed');
        const thumbnailUrl = this.getImageUrl(image, 'thumbnail');
        
        if (compressedUrl) imageUrls.push(compressedUrl);
        if (thumbnailUrl) imageUrls.push(thumbnailUrl);
      } else if (image.type === 'video' && image.urlThumbnail) {
        const posterUrl = this.getVideoPosterUrl(image);
        if (posterUrl) imageUrls.push(posterUrl);
      }
    });

    // Preload images with high priority since they're already visible
    if (imageUrls.length > 0) {
      this._mobileCacheService.preloadImages(imageUrls, 'publication', 'high');
    }
  }
}
