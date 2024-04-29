import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';
import { Alerts, Position } from './../enums/alerts.enum';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  constructor(private _router: Router) { }

  showAlert(
    title: string,
    message: string,
    icon?: Alerts,
    position?: Position,
    animation?: boolean,
    showConfirmButton?: boolean,
    confirmButtonText?: string,
    options?: [string | null]
  ) {
    message = message.replace(/<br>/g, '\n');
    Swal.fire({
      title: title,
      text: message,
      icon: icon,
      position: position ? position : Position.CENTER,
      animation: animation ? animation : true,
      showConfirmButton: showConfirmButton ? showConfirmButton : false,
      confirmButtonText: showConfirmButton ? confirmButtonText : '',
      customClass: {
        container: 'custom-swal-container custom-swal-center',
      },
    }).then((result) => {
      if (result.isConfirmed) {
        if (options) {
          this._router.navigate([options[0]]);
        }
        if (options === null) {
          Swal.close();
        }
      }
    });
  }
}
