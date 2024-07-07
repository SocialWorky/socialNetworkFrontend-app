import { Component, OnInit, ViewChild, ElementRef, Input, Inject, ChangeDetectorRef } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { WorkyButtonType, WorkyButtonTheme } from '@shared/modules/buttons/models/worky-button-model';
import { AlertService } from '@shared/services/alert.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import * as EXIF from 'exif-js';

@Component({
  selector: 'worky-image-upload-modal',
  templateUrl: './image-upload-modal.component.html',
  styleUrls: ['./image-upload-modal.component.scss']
})
export class ImageUploadModalComponent implements OnInit {
  WorkyButtonType = WorkyButtonType;
  WorkyButtonTheme = WorkyButtonTheme;

  @ViewChild('fileInput')
  fileInput!: ElementRef;

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
    const files: FileList = event.target.files;
    this.handleFiles(files);
  }

  async handleFiles(files: FileList): Promise<void> {
    const validFiles: File[] = [];
    const validPreviews: { url: string, type: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        const rotatedImageUrl = await this.getRotatedImageUrl(file);
        validFiles.push(file);
        validPreviews.push({ url: rotatedImageUrl, type: file.type });

        if (validFiles.length + this.selectedFiles.length >= this.maxFiles) {
          break;
        }
      } else {
        this.showAlert('Tipo de archivo no permitido: ' + file.name);
      }
    }

    this.selectedFiles = [...this.selectedFiles, ...validFiles];
    this.previews = [...this.previews, ...validPreviews];
    this._cdr.markForCheck();
  }

  async getRotatedImageUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const image = new Image();
        image.src = e.target.result;
        image.onload = () => {
          EXIF.getData(image, () => {
            const orientation = EXIF.getTag(this, 'Orientation');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            canvas.width = image.width;
            canvas.height = image.height;

            switch (orientation) {
              case 6:
                canvas.width = image.height;
                canvas.height = image.width;
                ctx.rotate(Math.PI / 2);
                ctx.drawImage(image, 0, -image.height);
                break;
              case 8:
                canvas.width = image.height;
                canvas.height = image.width;
                ctx.rotate(-Math.PI / 2);
                ctx.drawImage(image, -image.width, 0);
                break;
              case 3:
                ctx.rotate(Math.PI);
                ctx.drawImage(image, -image.width, -image.height);
                break;
              default:
                ctx.drawImage(image, 0, 0);
                break;
            }

            resolve(canvas.toDataURL());
          });
        };
      };
      reader.readAsDataURL(file);
    });
  }

  showAlert(message: string) {
    this._alertService.showAlert(
      'warning',
      message,
      Alerts.ERROR,
      Position.CENTER,
      true,
      true,
      'Cerrar',
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
    this.selectedFiles.splice(index, 1);
    this.previews.splice(index, 1);
    this._cdr.markForCheck();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files) {
      this.handleFiles(files);
    }
  }
}
