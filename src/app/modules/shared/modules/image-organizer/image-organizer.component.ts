import { Component, Input, OnInit } from '@angular/core';
import { ImageOrganizer } from './interfaces/image-organizer.interface';
import { environment } from '@env/environment';

@Component({
  selector: 'worky-image-organizer',
  templateUrl: './image-organizer.component.html',
  styleUrls: ['./image-organizer.component.scss'],
})
export class ImageOrganizerComponent implements OnInit {

  @Input() images: ImageOrganizer[] = [];
  galleryItems: any[] = [];
  urlMediaApi = environment.APIFILESERVICE;
  lightboxOpen = false;
  currentItem: any = null;

  ngOnInit(): void {
    this.galleryItems = this.images.map(image => {
      if (this.isImageUrl(image.urlCompressed)) {
        return {
          src: this.urlMediaApi + image.urlCompressed,
          isImage: true,
          isVideo: false
        };
      } else if (this.isVideoUrl(image.url)) {
        return {
          src: this.urlMediaApi + image.url,
          isImage: false,
          isVideo: true
        };
      } else {
        return null;
      }
    }).filter(item => item !== null);
  }

  isImageUrl(url: string): boolean {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  }

  isVideoUrl(url: string): boolean {
    return /\.(mp4|ogg|webm|avi|mov)$/i.test(url);
  }

  openLightbox(index: number): void {
    this.currentItem = this.galleryItems[index];
    this.lightboxOpen = true;
  }

  closeLightbox(): void {
    this.lightboxOpen = false;
    this.currentItem = null;
  }
}
