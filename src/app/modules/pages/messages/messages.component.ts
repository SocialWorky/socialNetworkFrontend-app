import { Component, OnInit } from '@angular/core';
import { AuthService } from '@auth/services/auth.service';
import { Token } from '@shared/interfaces/token.interface';

@Component({
  selector: 'worky-messages',
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.scss'],
})
export class MessagesComponent {

  userName: string = '';

  decodedToken!: Token;

  isAuthenticated: boolean = false;

  isActive: boolean = true;

  constructor(private _authService: AuthService) { 
    this.isAuthenticated = this._authService.isAuthenticated();
    if (this.isAuthenticated) {
      this.decodedToken = this._authService.getDecodedToken();
      this.userName = this.decodedToken.name;
    }
  }

  toggleActive(): void {
    this.isActive = !this.isActive; // Alterna el estado
  }

}
