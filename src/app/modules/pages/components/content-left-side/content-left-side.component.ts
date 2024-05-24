import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/modules/auth/services/auth.service';
import { Token } from 'src/app/modules/shared/interfaces/token.interface';

@Component({
  selector: 'worky-content-left-side',
  templateUrl: './content-left-side.component.html',
  styleUrls: ['./content-left-side.component.scss'],
})
export class ContentLeftSideComponent  {

  userName: string = '';

  decodedToken!: Token;

  isAuthenticated: boolean = false;

  constructor(private _authService: AuthService) { 
    this.isAuthenticated = this._authService.isAuthenticated();
    if (this.isAuthenticated) {
      this.decodedToken = this._authService.getDecodedToken();
      this.userName = this.decodedToken.name;
    }
  }
}
