import { ChangeDetectionStrategy, Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ImageOrganizer } from './interfaces/image-organizer.interface';
import { environment } from '@env/environment';
import { MediaViewComponent } from './components/media-view/media-view.component';
import { PublicationView, Comment } from '@shared/interfaces/publicationView.interface';
import { DeviceDetectionService } from '@shared/services/device-detection.service';

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

  images: ImageOrganizer[] = [];

  galleryItems: any[] = [];

  urlMediaApi = environment.APIFILESERVICE;

  lightboxOpen = false;

  currentItem: any = null;

  get isMobile(): boolean {
    return this._deviceDetectionService.isMobile();
  }

  constructor(
    private _dialog: MatDialog,
    private _deviceDetectionService: DeviceDetectionService
  ) { }

  ngOnInit(): void {

  }

  ngOnChanges(changes: SimpleChanges) {
    if(this.type === 'publication') {
      this.images = this.publication ? this.publication.media : [];
    } else if(this.type === 'comment') {
      this.images = this.comment ? this.comment.media : [];
    }

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

  openViewMedia(imagenSelected: ImageOrganizer): void {
    const dialogRef = this._dialog.open(MediaViewComponent, {
      width: this.isMobile ? '100vw' : '95vw',
      height: this.isMobile? '100vh' : '95vh',
      maxWidth: this.isMobile? '100vw' : '95vw',
      panelClass: 'view-media-modal-container',
      data: {
        images: this.images,
        imageSelected: imagenSelected,
        comment: this.comment,
        publication: this.publication,
        type: this.type
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('The dialog was closed', result);
      }
    });
  }
}
