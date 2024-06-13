import { Token } from '@shared/interfaces/token.interface'
import { Component } from '@angular/core';
import { AuthService } from '@auth/services/auth.service';

@Component({
  selector: 'side-left',
  templateUrl: './side-left.component.html',
  styleUrls: ['./side-left.component.scss'],
})
export class SideLeftComponent{

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
