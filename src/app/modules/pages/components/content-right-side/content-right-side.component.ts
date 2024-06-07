import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';

@Component({
  selector: 'worky-content-right-side',
  templateUrl: './content-right-side.component.html',
  styleUrls: ['./content-right-side.component.scss'],
})
export class ContentRightSideComponent {

  isUserProfile: boolean = false;

  isUserHome: boolean = false;

  constructor(private router: Router) {
    // Suscribirse a los cambios en la ruta para actualizar isUserProfile
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        // Comprueba si la ruta actual es el perfil del usuario
        this.isUserProfile = this.router.url.includes('/profile');
        this.isUserHome = this.router.url === '/';
      }
    });
  }
}
