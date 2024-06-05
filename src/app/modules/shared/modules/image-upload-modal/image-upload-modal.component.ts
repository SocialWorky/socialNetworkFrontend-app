import { Component, OnInit, ViewChild, ElementRef, Input, Inject, ChangeDetectorRef } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { WorkyButtonType, WorkyButtonTheme } from '@shared/modules/buttons/models/worky-button-model';
import { AlertService } from '@shared/services/alert.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';

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
    const validFiles: File[] = [];
    const validPreviews: { url: string, type: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        validFiles.push(file);
        const reader = new FileReader();
        reader.onload = (e: any) => {
          validPreviews.push({ url: e.target.result, type: file.type });

          if (validPreviews.length === validFiles.length) {
            this.selectedFiles = [...this.selectedFiles, ...validFiles];
            this.previews = [...this.previews, ...validPreviews];
            this._cdr.markForCheck();
          }
        };
        reader.readAsDataURL(file);
      } else {
        this._alertService.showAlert(
          'warning',
          `Tipo de archivo no permitido: ${file.name}`,
           Alerts.ERROR,
           Position.CENTER,
           true,
           true,
           'Cerrar',
        );
      }

      if (validFiles.length + this.selectedFiles.length >= this.maxFiles) {
        break;
      }
    }
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

  private handleFiles(files: FileList): void {
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.previews.push({ url: e.target.result, type: file.type });
          this.selectedFiles.push(file);
          this._cdr.markForCheck();
        };
        reader.readAsDataURL(file);
      } else {
        this._alertService.showAlert(
          'warning',
          `Tipo de archivo no permitido: ${file.name}`,
          Alerts.ERROR,
          Position.CENTER,
          true,
          true,
          'Cerrar',
        );
      }
    });
  }
}
