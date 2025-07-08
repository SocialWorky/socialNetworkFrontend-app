import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { ImageOrganizer } from '../../../interfaces/image-organizer.interface';
import { environment } from '@env/environment';
import { DeviceDetectionService } from '@shared/services/device-detection.service';

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

  urlFilesService = environment.APIFILESERVICE;

  constructor(private _deviceDetectionService: DeviceDetectionService) { }

  ngOnInit(): void {}

  ngOnChanges(): void {
    this.updateSelectedImage();
  }

  updateSelectedImage(): void {
    if (this.imageSelected && this.images.length) {
      const index = this.images.findIndex(img => img._id === this.imageSelected?._id);
      if (index !== -1) {
        this.currentIndex = index;
        this.imageSelected = { ...this.images[index] }; // Copia limpia
        this.imageChanged.emit(this.imageSelected._id);
      }
    }
  }

  previousImage(): void {
    if (this.images.length) {
      this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
      this.imageSelected = { ...this.images[this.currentIndex] };
      this.imageChanged.emit(this.imageSelected._id);
    }
  }

  nextImage(): void {
    if (this.images.length) {
      this.currentIndex = (this.currentIndex + 1) % this.images.length;
      this.imageSelected = { ...this.images[this.currentIndex] };
      this.imageChanged.emit(this.imageSelected._id);
    }
  }

  selectImage(image: ImageOrganizer): void {
    this.imageSelected = { ...image };
    this.currentIndex = this.images.findIndex(i => i._id === image._id);
    this.imageChanged.emit(this.imageSelected._id);
  }

  openImage(image: ImageOrganizer): void {
    window.open(image.url, '_blank')?.focus();
  }

  isImage(): boolean {
    return this.imageSelected?.type === 'image';
  }

  isVideo(): boolean {
    return this.imageSelected?.type === 'video';
  }
}
