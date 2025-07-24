import { Component, EventEmitter, Input, OnChanges, OnInit, Output, ChangeDetectorRef } from '@angular/core';
import { ImageOrganizer } from '../../../interfaces/image-organizer.interface';
import { environment } from '@env/environment';
import { DeviceDetectionService } from '@shared/services/device-detection.service';
import { UtilityService } from '@shared/services/utility.service';

@Component({
    selector: 'worky-image-loading',
    templateUrl: './image-loading.component.html',
    styleUrls: ['./image-loading.component.scss'],
    standalone: false
})
export class ImageLoadingComponent implements OnInit, OnChanges {
  get isMobile(): boolean {
    return this._deviceDetectionService.isMobile();
  }

  @Input() images: ImageOrganizer[] = [];

  @Input() imageSelected: ImageOrganizer | undefined;

  @Output() imageChanged = new EventEmitter<string>();

  currentIndex: number = 0;
  currentImage: ImageOrganizer | undefined;

  urlFilesService = environment.APIFILESERVICE;

  constructor(
    private _deviceDetectionService: DeviceDetectionService,
    private _utilityService: UtilityService,
    private _cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {}

  ngOnChanges(): void {
    this.updateSelectedImage();
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
    
    // Verificar si la URL ya contiene el prefijo del servicio
    if (url.startsWith('http')) {
      return url;
    }
    
    // Si no tiene el prefijo, agregarlo
    const baseUrl = this.urlFilesService.endsWith('/') ? this.urlFilesService.slice(0, -1) : this.urlFilesService;
    const imagePath = url.startsWith('/') ? url : '/' + url;
    
    return baseUrl + imagePath;
  }

  getVideoUrl(image: ImageOrganizer | undefined): string {
    if (!image) return '';
    if (!image.urlCompressed) return '';
    
    // Verificar si la URL ya contiene el prefijo del servicio
    if (image.urlCompressed.startsWith('http')) {
      return image.urlCompressed;
    }
    
    // Si no tiene el prefijo, agregarlo
    const baseUrl = this.urlFilesService.endsWith('/') ? this.urlFilesService.slice(0, -1) : this.urlFilesService;
    const imagePath = image.urlCompressed.startsWith('/') ? image.urlCompressed : '/' + image.urlCompressed;
    
    return baseUrl + imagePath;
  }

  getVideoPosterUrl(image: ImageOrganizer | undefined): string {
    if (!image) return '';
    if (!image.urlThumbnail) return '';
    
    // Verificar si la URL ya contiene el prefijo del servicio
    if (image.urlThumbnail.startsWith('http')) {
      return image.urlThumbnail;
    }
    
    // Si no tiene el prefijo, agregarlo
    const baseUrl = this.urlFilesService.endsWith('/') ? this.urlFilesService.slice(0, -1) : this.urlFilesService;
    const imagePath = image.urlThumbnail.startsWith('/') ? image.urlThumbnail : '/' + image.urlThumbnail;
    
    return baseUrl + imagePath;
  }
}
