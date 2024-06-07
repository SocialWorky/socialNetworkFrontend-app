import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { EditInfoProfileComponent } from '@shared/modules/edit-info-profile/edit-info-profile.component';

@Component({
  selector: 'app-profiles',
  templateUrl: './profiles.component.html',
  styleUrls: ['./profiles.component.scss'],
})
export class ProfilesComponent  implements OnInit {

  constructor(public dialog: MatDialog) { }

  abrirFormulario() {
    const dialogRef = this.dialog.open(EditInfoProfileComponent, {
      width: '250px',
      // Puedes pasar datos al modal si es necesario
    });

    dialogRef.afterClosed().subscribe(result => {
      // Acciones después de cerrar el modal
    });
  }

  ngOnInit() {}

}
