import { ChangeDetectionStrategy, Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ImageOrganizer, MediaType } from './interfaces/image-organizer.interface';
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

  get isIphone(): boolean {
    return this._deviceDetectionService.isIphone();
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

    this.images.map(image => {
      image.type = this.isImageUrl(image.url) ? MediaType.IMAGE : MediaType.VIDEO;
    })
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
