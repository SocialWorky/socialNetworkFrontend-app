import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { translations } from './../../../../../translations/translations'
import { DeviceDetectionService } from './../../../shared/services/DeviceDetection.service';
import { DropdownDataLink } from './../../../shared/worky-dropdown/interfaces/dataLink.interface';

@Component({
  selector: 'worky-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent implements OnInit, OnDestroy {
  token = localStorage.getItem('token');

  searchTerm: string = '';

  isMobile: boolean = false;

  dataLinkProfile:DropdownDataLink[] = [];

  resizeSubscription: Subscription | undefined;

  constructor(
    private _router: Router,
    private _deviceDetectionService: DeviceDetectionService,
    private _cdr: ChangeDetectorRef
  ) {
    this.menuProfile();
  }

  ngOnInit() {
    this.isMobile = this._deviceDetectionService.isMobile();
    this.resizeSubscription = this._deviceDetectionService.getResizeEvent().subscribe(() => {
      this.isMobile = this._deviceDetectionService.isMobile();
      this._cdr.markForCheck();
    });
  }

  ngOnDestroy() {
    if (this.resizeSubscription) {
      this.resizeSubscription.unsubscribe();
    }
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

  menuProfile() {
  this.dataLinkProfile = [
    { link: '/auth/login',  title: 'Perfil' },
    { link: '/settings',  title: 'Configuración' },
    { function: this.logoutUser.bind(this),  title: translations['navbar.logout']},
  ];
}

  handleLinkClicked(data: DropdownDataLink) {
    if (data.function) {
      if (typeof data.function === 'function') {
        data.function();
      }
    }
    if (data.link) {
      this._router.navigate([data.link]);
    }
  }
}
