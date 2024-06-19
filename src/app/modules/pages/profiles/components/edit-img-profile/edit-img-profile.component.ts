import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef, AfterViewChecked, Input, AfterViewInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject, lastValueFrom, takeUntil } from 'rxjs';
import Cropper from 'cropperjs';

import { ImageUploadModalComponent } from '@shared/modules/image-upload-modal/image-upload-modal.component';
import { FileUploadService } from '@shared/services/file-upload.service';
import { ProfileService } from '../../services/profile.service';
import { AuthService } from '@auth/services/auth.service';
import { environment } from '@env/environment';

@Component({
  selector: 'worky-edit-img-profile',
  templateUrl: './edit-img-profile.component.html',
  styleUrls: ['./edit-img-profile.component.scss'],
})
export class EditImgProfileComponent implements OnInit, AfterViewChecked, OnDestroy, AfterViewInit {
  private unsubscribe$ = new Subject<void>();

  imageSrc: string = '';

  selectedFiles: File[] = [];

  imgCoverDefault = '/assets/img/shared/drag-drop-upload-add-file.webp';

  previews = [{ url: this.imgCoverDefault, type: 'image' }];

  cropping = false;

  selectedImage: string | undefined;

  cropper: Cropper | undefined;

  originalMimeType: string | undefined;

  isUploading = false;

  @ViewChild('imageElement') imageElement: ElementRef | undefined;

  @ViewChild('cropperImage') cropperImage: ElementRef | undefined;

  @Input() profileImage?: string;

  @Input() isCurrentUser = false;

  constructor(
    private _cdr: ChangeDetectorRef,
    private _dialog: MatDialog,
    private _fileUploadService: FileUploadService,
    private _profileService: ProfileService,
    private _authService: AuthService,
  ) {}

  ngAfterViewInit(): void {
    if (this.profileImage) {
      this.previews[0].url = environment.APIFILESERVICE + this.profileImage;
    }
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  ngOnInit(): void {}

  ngAfterViewChecked() {
    if (this.cropping && this.cropperImage && !this.cropper) {
      this.initializeCropper();
    }
  }

  initializeCropper() {
    if (this.cropperImage && this.selectedImage) {
      if (this.cropper) {
        this.cropper.destroy();
      }
      this.cropper = new Cropper(this.cropperImage.nativeElement, {
        aspectRatio: 1200 / 250,
        viewMode: 1,
        scalable: true,
        zoomable: true,
        responsive: true,
        background: false,
      });
    }
  }

  cropImage() {
    if (this.cropper) {
      const croppedCanvas = this.cropper.getCroppedCanvas({
        width: this.imageElement?.nativeElement.offsetWidth,
        height: this.imageElement?.nativeElement.offsetHeight,
      });
      const croppedImageUrl = croppedCanvas.toDataURL(this.originalMimeType);
      this.previews[0].url = croppedImageUrl;
      this.cropping = false;
      this.cropper.destroy();
      this.cropper = undefined;
      this.selectedImage = croppedImageUrl;
      this._cdr.detectChanges();

      const file = this.dataURLtoFile(croppedImageUrl, this._authService.getDecodedToken().id, this.originalMimeType!);
      this.selectedFiles = [file];
    }
  }

  cancelCrop() {
    this.cropping = false;
    if (this.cropper) {
      this.cropper.destroy();
      this.cropper = undefined;
    }
  }

  async openUploadModal() {
    const dialogRef = this._dialog.open(ImageUploadModalComponent, {
      data: {
        maxFiles: 1,
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.length > 0) {
        this.selectedFiles = result;
        const file = this.selectedFiles[0];
        this.originalMimeType = file.type;
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.selectedImage = e.target.result;
          this.cropping = true;
          this._cdr.detectChanges();
        };
        reader.readAsDataURL(file);
      }
    });
  }

  async uploadImg() {
    this.isUploading = true;
    this._cdr.detectChanges();

    const userId = this._authService.getDecodedToken().id;
    const uploadLocation = 'profile';
    if (this.selectedImage) {
      const response = await lastValueFrom(
        this._fileUploadService.uploadFile(this.selectedFiles, uploadLocation).pipe(takeUntil(this.unsubscribe$))
      );

      await this._profileService.updateProfile(userId, {
        coverImage: uploadLocation + '/' + response[0].filename,
      }).pipe(takeUntil(this.unsubscribe$)).subscribe({
        next: (data) => {
          this.isUploading = false; 
          this._cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error updating profile', error);
          this.isUploading = false;
          this._cdr.detectChanges();
        }
      });

      this.previews[0].url = environment.APIFILESERVICE + uploadLocation + '/' + response[0].filename;

      await Promise.all(response);

      this.selectedFiles = [];
      this.selectedImage = undefined;
      this._cdr.markForCheck();
    }
  }

  dataURLtoFile(dataurl: string, filename: string, mimeType: string): File {
    const arr = dataurl.split(',');
    const mime = mimeType || arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    const extension = this.mimeToExtension(mime);

    return new File([u8arr], `${filename}.${extension}`, { type: mime });
  }

  mimeToExtension(mimeType: string): string {
    switch (mimeType) {
      case 'image/webp':
        return 'webp';
      case 'image/jpeg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'image/gif':
        return 'gif';
      case 'image/bmp':
        return 'bmp';
      default:
        return 'jpg';
    }
  }
}
