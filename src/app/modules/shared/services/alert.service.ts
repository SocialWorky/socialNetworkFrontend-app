import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import Swal, { SweetAlertOptions } from 'sweetalert2';
import { Observable, from } from 'rxjs';

import { Alerts, Position } from './../enums/alerts.enum';

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
    message = message.replace(/<br>/g, '\n');

    const swalOptions: SweetAlertOptions = {
      title: title,
      text: message,
      icon: icon as any || Alerts.SUCCESS,
      position: position || Position.CENTER,
      showConfirmButton: showConfirmButton,
      confirmButtonText: confirmButtonText || undefined,
      customClass: {
        container: 'custom-swal-container custom-swal-center',
      },
    };

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

  showConfirmation(
    title: string,
    message: string,
    confirmButtonText: string = 'Sí',
    cancelButtonText: string = 'No',
    icon: Alerts = Alerts.QUESTION,
    position: Position = Position.CENTER
  ): Observable<boolean> {
    message = message.replace(/<br>/g, '\n');

    const swalOptions: SweetAlertOptions = {
      title: title,
      text: message,
      icon: icon as any,
      position: position,
      showCancelButton: true,
      confirmButtonText: confirmButtonText,
      cancelButtonText: cancelButtonText,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      customClass: {
        container: 'custom-swal-container custom-swal-center',
      },
    };

    return from(Swal.fire(swalOptions).then((result) => {
      return result.isConfirmed;
    }));
  }
}
