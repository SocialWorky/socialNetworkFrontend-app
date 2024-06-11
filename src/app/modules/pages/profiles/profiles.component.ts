import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { EditInfoProfileComponent } from '@shared/modules/edit-info-profile/edit-info-profile.component';

@Component({
  selector: 'app-profiles',
  templateUrl: './profiles.component.html',
  styleUrls: ['./profiles.component.scss'],
})
export class ProfilesComponent implements OnInit {
  isCurrentUser: boolean = false;

  constructor(public dialog: MatDialog) {}

  abrirFormulario() {
    const dialogRef = this.dialog.open(EditInfoProfileComponent, {
      width: '250px',
      // Puedes pasar datos al modal si es necesario
    });

    dialogRef.afterClosed().subscribe(result => {
      // Acciones después de cerrar el modal
    });
  }

  followUser() {
    // Lógica para seguir al usuario
    console.log('Following the user');
  }

  addFriend() {
    // Lógica para añadir al usuario como amigo
    console.log('Adding the user as a friend');
  }

  ngOnInit() {
    this.checkIfCurrentUser();
  }

  checkIfCurrentUser() {
    // Lógica para determinar si el usuario actual es el propietario del perfil
    // Esto es un ejemplo y deberías reemplazarlo con tu lógica real
    const currentUserId = 'user123'; // Supongamos que este es el ID del usuario actual
    const profileOwnerId = 'user123'; // Supongamos que este es el ID del propietario del perfil
    this.isCurrentUser = currentUserId === profileOwnerId;
  }
}
