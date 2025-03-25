import { Injectable } from '@angular/core';
import Swal, { SweetAlertOptions } from 'sweetalert2';
import { Alerts, Position } from './../enums/alerts.enum';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AlertService {
  constructor(private _router: Router) {}

  showAlert(
    title: string,
    message: string,
    icon?: Alerts,
    position?: Position,
    showConfirmButton: boolean = false,
    confirmButtonText?: string,
    options?: [string | null]
  ) {
    // Reemplazar <br> con saltos de línea
    message = message.replace(/<br>/g, '\n');

    // Configuración de SweetAlert2
    const swalOptions: SweetAlertOptions = {
      title: title,
      text: message,
      icon: icon as any, // Asegúrate de que `Alerts` sea compatible con SweetAlertIcon
      position: position || Position.CENTER,
      showConfirmButton: showConfirmButton,
      confirmButtonText: confirmButtonText || undefined,
      customClass: {
        container: 'custom-swal-container custom-swal-center',
      },
    };

    // Mostrar la alerta
    Swal.fire(swalOptions).then((result) => {
      if (result.isConfirmed) {
        if (options && options[0]) {
          this._router.navigate([options[0]]);
        }
        if (options === null) {
          Swal.close();
        }
      }
    });
  }
}
