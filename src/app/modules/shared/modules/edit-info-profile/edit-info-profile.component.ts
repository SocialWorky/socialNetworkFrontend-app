import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core'; // Importa ChangeDetectorRef
import { ProfileService } from './profile-service/profileService'; // Asegúrate de importar el servicio

@Component({
  selector: 'app-edit-info-profile',
  templateUrl: './edit-info-profile.component.html',
  styleUrls: ['./edit-info-profile.component.scss'],
})
export class EditInfoProfileComponent implements OnInit {
  @Output() cambiosGuardados = new EventEmitter<void>();
  editProfileForm: FormGroup;
  isSaved: boolean = false;

  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService,
    private _cdr: ChangeDetectorRef // Inyecta ChangeDetectorRef
  ) {
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
      this.isSaved = true;
      this.profileService.actualizarPerfil(); // Llamar al método del servicio para actualizar el perfil
      this.cambiosGuardados.emit(); // Emitir el evento cuando se guarden los cambios
      this._cdr.detectChanges(); // Forzar la detección de cambios
    }
  }
}
