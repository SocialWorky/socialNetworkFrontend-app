// image-organizer.component.ts

import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { ImageOrganizer } from './interfaces/image-organizer.interface';
import { environment } from '@env/environment';

@Component({
  selector: 'worky-image-organizer',
  templateUrl: './image-organizer.component.html',
  styleUrls: ['./image-organizer.component.scss'],
})
export class ImageOrganizerComponent implements OnInit {

  @Input() images?: ImageOrganizer[] = [];

  urlMediaApi = environment.APIFILESERVICE;

  constructor(private _cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // No es necesario asignar this.images = this.images; aquí
    // Puedes hacer cualquier inicialización adicional aquí si es necesario
  }

  isImageUrl(url: string): boolean {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  }

  isVideoUrl(url: string): boolean {
    return /\.(mp4|ogg|webm|avi|mov)$/i.test(url);
  }

  videoLoaded(event: Event): void {
    this._cdr.markForCheck();
  }

}
