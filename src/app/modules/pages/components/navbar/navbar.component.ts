import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DeviceDetectionService } from './../../../shared/services/DeviceDetection.service';

@Component({
  selector: 'worky-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent implements OnInit {
  token = localStorage.getItem('token');

  searchTerm: string = '';

  get isMobile(): boolean {
    return this._deviceDetectionService.isMobile();
  }

  constructor(
    private _router: Router,
    private _deviceDetectionService: DeviceDetectionService
  ) {}

  ngOnInit() {
    console.log('isMobile:', this.isMobile);
  }

  logoutUser() {
    localStorage.removeItem('token');
    this._router.navigate(['/auth']);
  }

  search(event: Event) {
    // Realiza la búsqueda si el término tiene al menos 3 caracteres
    if (this.searchTerm.trim().length >= 3) {
      console.log('Buscar:', this.searchTerm);
    }
  }

  onInputChange(event: Event) {
    // Realiza la búsqueda automáticamente si se escriben más de 3 caracteres
    if (this.searchTerm.trim().length >= 3) {
      this.search(event);
    }
  }

  onEnter(event: any) {
    // Realiza la búsqueda si se presiona "Enter" y el término tiene al menos 3 caracteres
    if (event.key === 'Enter' && this.searchTerm.trim().length >= 3) {
      this.search(event);
    }
  }

}
