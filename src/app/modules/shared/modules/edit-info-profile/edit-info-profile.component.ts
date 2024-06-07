import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-edit-info-profile',
  templateUrl: './edit-info-profile.component.html',
  styleUrls: ['./edit-info-profile.component.scss'],
})
export class EditInfoProfileComponent implements OnInit {
  editProfileForm: FormGroup = this.fb.group({
    titulo: ['', Validators.required],
    usuario: ['', Validators.required],
    descripcion: ['', Validators.required],
    url: ['', Validators.required],
    // Añade aquí más campos según necesites
  });

  constructor(private fb: FormBuilder) { }

  ngOnInit() {
    // Aquí puedes establecer valores iniciales si es necesario
  }

  guardarCambios() {
    if (this.editProfileForm.valid) {
      // Convertir los datos del formulario a una cadena JSON
      const datosFormulario = JSON.stringify(this.editProfileForm.value);
      // Guardar los datos en localStorage
      localStorage.setItem('datosPerfil', datosFormulario);
      // Cerrar el modal después de guardar los cambios
      // ... tu código para cerrar el modal
      console.log('Cambios guardados localmente.');
    }
  }
  
}

