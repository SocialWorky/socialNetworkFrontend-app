import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-edit-img',
  templateUrl: './edit-img.component.html',
  styleUrls: ['./edit-img.component.scss'],
})
export class EditImgComponent implements OnInit {
  imageSrc: string = '/assets/img/1366_521.png'; // Ruta de tu imagen predeterminada
  showIcon: boolean = false;
  dialogVisible: boolean = false;

  constructor() {}

  ngOnInit() {
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
      };
      reader.readAsDataURL(file);
      this.dialogVisible = false;
    }
  }

  openDialog(): void {
    this.dialogVisible = true;
  }

  closeDialog(): void {
    this.dialogVisible = false;
  }

  removeImage(): void {
    this.imageSrc = ''; // O pon una imagen predeterminada de "sin imagen"
    localStorage.removeItem('savedImage'); // Remover de localStorage
    this.dialogVisible = false;
  }
}
