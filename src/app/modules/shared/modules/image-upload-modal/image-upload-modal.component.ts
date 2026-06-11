import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, ViewChild, ElementRef, ChangeDetectorRef, Inject } from '@angular/core';
import { ImageLoadOptions } from '../../services/image.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { WorkyButtonType, WorkyButtonTheme } from '@shared/modules/buttons/models/worky-button-model';
import { AlertService } from '@shared/services/alert.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';

@Component({
    selector: 'worky-image-upload-modal',
    templateUrl: './image-upload-modal.component.html',
    styleUrls: ['./image-upload-modal.component.scss'],
    standalone: false
})
export class ImageUploadModalComponent implements OnInit {
  private readonly ALLOWED_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff', 'image/webp',
    'video/mp4', 'video/mpeg', 'video/quicktime', 'video/avi',
  ]);

  WorkyButtonType = WorkyButtonType;

  WorkyButtonTheme = WorkyButtonTheme;

  loading = false;

  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef;

  selectedFiles: File[] = [];

  previews: { url: string, type: string }[] = [];

  @Input()
  maxFiles: number = 10;

  constructor(
    private _alertService: AlertService,
    private _cdr: ChangeDetectorRef,
    private _dialogRef: MatDialogRef<ImageUploadModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    if (data) {
      this.maxFiles = data.maxFiles;
    }
  }

  ngOnInit(): void {}

  onFileSelected(event: any) {
    this.loading = true;
    this._cdr.detectChanges();
    const files: FileList = event.target.files;
    this.handleFiles(files);
  }

  handleFiles(files: FileList): void {
    const newFiles: File[] = [];
    const newPreviews: { url: string, type: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      if (newFiles.length + this.selectedFiles.length >= this.maxFiles) {
        break;
      }
      const file = files[i];

      if (this.ALLOWED_TYPES.has(file.type)) {
        newFiles.push(file);
        // Object URL (blob:) instead of base64: lightweight and renders the video frame.
        // For videos seek to 0.1s (#t=0.1) so a real frame shows instead of a black one.
        const blobUrl = URL.createObjectURL(file);
        const url = file.type.startsWith('video/') ? `${blobUrl}#t=0.1` : blobUrl;
        newPreviews.push({ url, type: file.type });
      } else {
        this.showAlert('imageUpload.fileTypeNotAllowed' + ': ' + file.name);
      }
    }

    if (newFiles.length) {
      this.selectedFiles = [...this.selectedFiles, ...newFiles];
      this.previews = [...this.previews, ...newPreviews];
    }
    this.loading = false;
    this._cdr.markForCheck();
  }

  showAlert(message: string) {
    this._alertService.showAlert(
      'warning',
      message,
      Alerts.ERROR,
      Position.CENTER,
      true,
      'button.close',
    );
  }

  closeDialog() {
    this._dialogRef.close();
  }

  upload() {
    if (this.selectedFiles.length === 0) {
      return;
    }
    this._dialogRef.close(this.selectedFiles);
  }

  removeFile(index: number) {
    const base = this.previews[index]?.url?.split('#')[0];
    if (base?.startsWith('blob:')) URL.revokeObjectURL(base);
    this.selectedFiles.splice(index, 1);
    this.previews.splice(index, 1);
    this._cdr.markForCheck();
  }

  onDragOver(event: DragEvent): void {
    this.loading = true;
    this._cdr.markForCheck();
    event.preventDefault();
  }

  onDragLeave(event: DragEvent): void {
    this.loading = false;
    this._cdr.markForCheck();
    event.preventDefault();
  }

  onDrop(event: DragEvent): void {
    this.loading = true;
    this._cdr.markForCheck();
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files) {
      this.handleFiles(files);
    }
  }
}
