import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-edit-info-profile',
  templateUrl: './edit-info-profile.component.html',
  styleUrls: ['./edit-info-profile.component.scss'],
})
export class EditInfoProfileComponent implements OnInit {
  editProfileForm: FormGroup;
  isSaved: boolean = false;

  constructor(private fb: FormBuilder) {
    this.editProfileForm = this.fb.group({
      titulo: ['', Validators.required],
      descripcion: ['', Validators.required],
      url: ['', Validators.required],
    });
  }

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    const datosGuardados = localStorage.getItem('datosPerfil');
    if (datosGuardados) {
      this.editProfileForm.setValue(JSON.parse(datosGuardados));
    }
  }

  guardarCambios() {
    if (this.editProfileForm.valid) {
      const datosFormulario = JSON.stringify(this.editProfileForm.value);
      localStorage.setItem('datosPerfil', datosFormulario);
      console.log('Cambios guardados localmente.');
      this.isSaved = true;
      // Desplazar el contenido del modal hacia el mensaje de éxito
      setTimeout(() => {
        const modalBody = document.querySelector('.modal-body');
        if (modalBody) {
          modalBody.scrollTop = modalBody.scrollHeight;
        }
      }, 0);
    }
  }
}
