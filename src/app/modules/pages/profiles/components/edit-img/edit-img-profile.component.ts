import { Component, OnInit, ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'worky-edit-img-profile',
  templateUrl: './edit-img-profile.component.html',
  styleUrls: ['./edit-img-profile.component.scss'],
})
export class EditImgProfileComponent implements OnInit {
  imageSrc: string = '/assets/img/shared/drag-drop-upload-add-file.webp';

  showIcon: boolean = false;

  dialogVisible: boolean = false;

  constructor(private _cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    const savedImage = localStorage.getItem('savedImage');
    if (savedImage) {
      this.imageSrc = savedImage;
    }
  }

  loadImage(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imageSrc = e.target.result;
        localStorage.setItem('savedImage', this.imageSrc); // Guardar en localStorage
        this._cdr.detectChanges(); // Forzar la detección de cambios
      };
      reader.readAsDataURL(file);
      this.dialogVisible = false;
      this._cdr.detectChanges(); // Forzar la detección de cambios
    }
  }

  openDialog(): void {
    this.dialogVisible = true;
    this._cdr.detectChanges(); // Forzar la detección de cambios
  }

  closeDialog(): void {
    this.dialogVisible = false;
    this._cdr.detectChanges(); // Forzar la detección de cambios
  }

  removeImage(): void {
    this.imageSrc = ''; // O pon una imagen predeterminada de "sin imagen"
    localStorage.removeItem('savedImage'); // Remover de localStorage
    this.dialogVisible = false;
    this._cdr.detectChanges(); // Forzar la detección de cambios
  }
}
