import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';
import { Alerts, Position } from './../enums/alerts.enum';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  constructor() { }

  showAlert(
    title: string,
    message: string,
    icon?: Alerts,
    position?: Position,
    animation?: boolean,
    showConfirmButton?: boolean,
    confirmButtonText?: string,
  ) {
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
    });
  }
}