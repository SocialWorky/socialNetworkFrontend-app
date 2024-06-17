import { Component, OnInit, OnDestroy } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';

import { Token } from '@shared/interfaces/token.interface';
import { AuthService } from '@auth/services/auth.service';
import { EditInfoProfileComponent } from './components/edit-info-profile/edit-info-profile.component';
import { ProfileService } from './services/profile.service';
import { UserService } from '@shared/services/users.service';

@Component({
  selector: 'app-profiles',
  templateUrl: './profiles.component.html',
  styleUrls: ['./profiles.component.scss'],
})
export class ProfilesComponent implements OnInit, OnDestroy {
  userName: string = '';
  userData: any; // Variable para almacenar los datos del perfil

  decodedToken!: Token;

  isAuthenticated: boolean = false;
  isCurrentUser: boolean = false;

  private perfilSubscription!: Subscription;

  constructor(
    public dialog: MatDialog,
    private _authService: AuthService,
    private profileService: ProfileService,
    private userService: UserService,
    private _cdr: ChangeDetectorRef 
  ) {
    this.isAuthenticated = this._authService.isAuthenticated();
    if (this.isAuthenticated) {
      this.decodedToken = this._authService.getDecodedToken();
      this.userName = this.decodedToken.name;
      this.obtenerDatosPerfil(); // Obtener los datos del perfil al inicializar el componente
    }
  }

  ngOnInit(): void {
    this.checkIfCurrentUser();
    // Suscribirse a los cambios en el perfil
    this.perfilSubscription = this.profileService.perfilActualizado$.subscribe(() => {
      this.obtenerDatosPerfil(); // Actualizar los datos del perfil cuando se emita el evento
      this._cdr.detectChanges(); // Forzar la detección de cambios
    });
  }

  ngOnDestroy(): void {
    if (this.perfilSubscription) {
      this.perfilSubscription.unsubscribe(); // Desuscribirse para evitar fugas de memoria
    }
  }

  abrirFormulario(): void {
    const dialogRef = this.dialog.open(EditInfoProfileComponent, {
      width: '250px',
      // Puedes pasar datos al modal si es necesario
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.actualizado) {
        this.obtenerDatosPerfil(); // Actualizar los datos del perfil si se guardaron cambios
        this._cdr.detectChanges(); // Forzar la detección de cambios
      }
    });
  }

  checkIfCurrentUser(): void {
    // Lógica para determinar si el usuario actual es el propietario del perfil
    // Esto es un ejemplo y deberías reemplazarlo con tu lógica real
    const currentUserId = 'user123'; // Supongamos que este es el ID del usuario actual
    const profileOwnerId = 'user123'; // Supongamos que este es el ID del propietario del perfil
    this.isCurrentUser = currentUserId === profileOwnerId;
  }

  obtenerDatosPerfil(): void {
    // Obtener los datos del perfil desde el almacenamiento local
    const datosPerfil = localStorage.getItem('datosPerfil');
    if (datosPerfil) {
      this.userData = JSON.parse(datosPerfil);
    }
  }

  cambiosGuardadosHandler(): void {
    this.obtenerDatosPerfil(); // Actualizar los datos del perfil
    this._cdr.detectChanges(); // Forzar la detección de cambios
  }
}
