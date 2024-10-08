import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { ImageOrganizer } from '../../../interfaces/image-organizer.interface';
import { environment } from '@env/environment';

@Component({
  selector: 'worky-image-loading',
  templateUrl: './image-loading.component.html',
  styleUrls: ['./image-loading.component.scss'],
})
export class ImageLoadingComponent implements OnInit, OnChanges {

  @Input() images: ImageOrganizer[] = [];

  @Input() imageSelected: ImageOrganizer | undefined;

  @Output() imageChanged = new EventEmitter<string>();

  currentIndex: number = 0;

  urlFilesService = environment.APIFILESERVICE;

  constructor() { }

  ngOnInit() {}

  ngOnChanges() {
    this.updateSelectedImage();
  }

  // Actualizar la imagen seleccionada basado en el ID
  updateSelectedImage() {
    if (this.imageSelected && this.images.length) {
      const selectedImage = this.images.find(image => image._id === this.imageSelected?._id);
      if (selectedImage) {
        this.currentIndex = this.images.indexOf(selectedImage);
        this.imageChanged.emit(this.imageSelected._id);
      }
    }
  }

  // Navegar a la imagen anterior
  previousImage() {
    if (this.images.length) {
      this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
      this.imageSelected = this.images[this.currentIndex];
      this.imageChanged.emit(this.imageSelected._id);
    }
  }

  // Navegar a la imagen siguiente
  nextImage() {
    if (this.images.length) {
      this.currentIndex = (this.currentIndex + 1) % this.images.length;
      this.imageSelected = this.images[this.currentIndex];
      this.imageChanged.emit(this.imageSelected._id);
    }
  }

  // Seleccionar una imagen directamente desde las miniaturas
  selectImage(image: ImageOrganizer) {
    this.imageSelected = image;
    this.currentIndex = this.images.indexOf(image);
    this.imageChanged.emit(this.imageSelected._id);
  }
}
