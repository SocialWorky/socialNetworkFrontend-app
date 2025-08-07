import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef, AfterViewChecked, Input, AfterViewInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject, lastValueFrom, takeUntil } from 'rxjs';
import Cropper from 'cropperjs';

import { ImageUploadModalComponent } from '@shared/modules/image-upload-modal/image-upload-modal.component';
import { FileUploadService } from '@shared/services/core-apis/file-upload.service';
import { ProfileService } from '../../services/profile.service';
import { AuthService } from '@auth/services/auth.service';
import { environment } from '@env/environment';
import { DeviceDetectionService } from '@shared/services/device-detection.service';
import { UtilityService } from '@shared/services/utility.service';
import { LazyCssService } from '@shared/services/core-apis/lazy-css.service';
import { FontLoaderService } from '@shared/services/core-apis/font-loader.service';
import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';

@Component({
    selector: 'worky-edit-img-profile',
    templateUrl: './edit-img-profile.component.html',
    styleUrls: ['./edit-img-profile.component.scss'],
    standalone: false
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

  isMobile = this._deviceDetectionService.isMobile();

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
    private _deviceDetectionService: DeviceDetectionService,
    private _utilityService: UtilityService,
    private _lazyCssService: LazyCssService,
    private _fontLoaderService: FontLoaderService,
    private _logService: LogService
  ) {}

  ngAfterViewInit(): void {
    if (this.profileImage) {
      this.previews[0].url = this.profileImage;
    }
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  ngOnInit(): void {
    this._authService.getDecodedToken();
    this.previews[0].url = this.profileImage || this.imgCoverDefault;
  }

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

      const file = this.dataURLtoFile(croppedImageUrl, this._authService.getDecodedToken()?.id!, this.originalMimeType!);
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

    dialogRef.afterClosed().pipe(takeUntil(this.unsubscribe$)).subscribe(result => {
      if (result && result.length > 0) {

        this.selectedFiles = result;
        const file = this.selectedFiles[0];
        this.originalMimeType = file.type;
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.selectedImage = e.target.result;
          if (!this.isMobile) this.cropping = true;
          this._cdr.markForCheck();
        };
        reader.readAsDataURL(file);

        if (this.isMobile) {
          setTimeout(() => {
            this.uploadImg();
          }, 300);
        }
      }
    });
  }

  async uploadImg() {
    this.isUploading = true;
    this._cdr.markForCheck();

    const userId = this._authService.getDecodedToken()?.id!;
    const uploadLocation = 'profile';

    if (this.cropper) {
      this.cropper.destroy();
    }
    this.cropper = new Cropper(this.imageElement?.nativeElement, {
      aspectRatio: 16/5,
      viewMode: 1,
      scalable: true,
      zoomable: true,
      responsive: true,
      background: false,
    });

    if (this.selectedImage && this.cropper) {
      try {
        const responseDesktop = await lastValueFrom(
          this._fileUploadService.uploadFile(this.selectedFiles, uploadLocation, null, null, TypePublishing.PROFILE_IMG).pipe(takeUntil(this.unsubscribe$))
        );

        // Handle the actual response structure: {message: string, files: Array}
        let desktopFilename: string;
        if (responseDesktop && typeof responseDesktop === 'object' && responseDesktop.files && Array.isArray(responseDesktop.files) && responseDesktop.files.length > 0) {
          const file = responseDesktop.files[0];
          desktopFilename = file.filename || file.name || file.url || file;
        } else {
          throw new Error('Invalid response structure from desktop upload - expected {message, files}');
        }

        if (!desktopFilename) {
          throw new Error('No filename found in desktop upload response');
        }

        const croppedCanvasMobile = this.cropper.getCroppedCanvas({
          width: 620,
          height: 190,
        });

        this.cropper.destroy();

        const croppedImageUrlMobile = croppedCanvasMobile.toDataURL(this.originalMimeType);
        const fileMobile = this.dataURLtoFile(croppedImageUrlMobile, `${userId}-mobile`, this.originalMimeType!);

        const responseMobile = await lastValueFrom(
          this._fileUploadService.uploadFile([fileMobile], uploadLocation, null, null, TypePublishing.PROFILE_IMG).pipe(takeUntil(this.unsubscribe$))
        );

        // Handle the actual response structure: {message: string, files: Array}
        let mobileFilename: string;
        if (responseMobile && typeof responseMobile === 'object' && responseMobile.files && Array.isArray(responseMobile.files) && responseMobile.files.length > 0) {
          const file = responseMobile.files[0];
          mobileFilename = file.filename || file.name || file.url || file;
        } else {
          throw new Error('Invalid response structure from mobile upload - expected {message, files}');
        }

        if (!mobileFilename) {
          throw new Error('No filename found in mobile upload response');
        }

        const coverMobile = environment.APIFILESERVICE + uploadLocation + '/' + mobileFilename;
        const coverDesktop = environment.APIFILESERVICE + uploadLocation + '/' + desktopFilename;

        await this._profileService.updateProfile(userId, {
          coverImage: coverDesktop,
          coverImageMobile: !this.isMobile ? coverMobile : coverDesktop,
        }).pipe(takeUntil(this.unsubscribe$)).subscribe({
          next: (data) => {
            this.isUploading = false;
            this._cdr.markForCheck();
          },
          error: (error) => {
            this._logService.log(LevelLogEnum.ERROR, 'EditImgProfileComponent', 'Error updating profile', { error });
            this.isUploading = false;
            this._cdr.markForCheck();
          }
        });

        this.previews[0].url = environment.APIFILESERVICE + uploadLocation + '/' + desktopFilename;

        this.selectedFiles = [];
        this.isUploading = false;
        this.selectedImage = undefined;
        this._cdr.markForCheck();
      } catch (error) {
        this._logService.log(LevelLogEnum.ERROR, 'EditImgProfileComponent', 'Error uploading image', { error });
        this.isUploading = false;
        this._cdr.markForCheck();
        // Reset state on error
        this.selectedFiles = [];
        this.selectedImage = undefined;
      }
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

  onImageError(event: Event): void {
    this._utilityService.handleImageError(event, this.imgCoverDefault);
  }
}
