import { Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { Token } from '../../shared/interfaces/token.interface';
import { AuthGoogleService } from './auth-google.service';
import { UserService } from '../../shared/services/users.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  getUserName(): string {
    throw new Error('Method not implemented.');
  }

  googleLoginSession = localStorage.getItem('googleLogin');

  constructor(
    private router: Router,
    private http: HttpClient,
    private _authGoogleService: AuthGoogleService,
    private _router: Router,
    private _userService: UserService
  ) {}

  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');

    if (token) {
      const decodedToken: any = jwtDecode(token);
      const currentTime = Math.floor(Date.now() / 1000);

      if (decodedToken && decodedToken.exp && (decodedToken.exp > currentTime)) {
        return true;
      } else {
        localStorage.removeItem('token');
        this.router.navigate(['/auth']);
        return false;
      }
    } else {
      this.router.navigate(['/auth']);
      return false;
    }
  }

  async renewToken(_id: string) {
    const token = localStorage.getItem('token');
    const url = `${environment.API_URL}/user/renewtoken/${_id}`;
    try {
      const response: any = await this.http.get(url, { headers: { Authorization: `Bearer ${token}` }, responseType: 'text' }).toPromise();
      const newToken = response;
      localStorage.setItem('token', newToken);
      return newToken;
    } catch (error) {
      console.error('Error al renovar el token:', error);
      throw error;
    }
  }

  getDecodedToken(): Token {
    const token = localStorage.getItem('token');
    if (token) {
      return jwtDecode(token);
    } else {
      throw new Error('Token not found.');
    }
  }

  getUseFromToken(token: string): Token {
    return jwtDecode(token);
  }

  generatePassword(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+';
    let password = '';
    
    for (let i = 0; i < 12; i++) {
        const index = Math.floor(Math.random() * characters.length);
        password += characters.charAt(index);
    }
    
    return password;
  }

  async generateUserName(email: string, name: string, lastName: string): Promise<string> {
      let username = `${name.toLowerCase().replace(/\s/g, '')}${lastName.toLowerCase().replace(/\s/g, '')}`;

      let exists = await this.checkExistingUserName(username);

      let counter = 1;
      while (exists) {
          username = `${username}${counter}`;
          exists = await this.checkExistingUserName(username);
          if (!exists) break;
          counter++;
      }

      return await username;
  }

  async checkExistingUserName(username: string): Promise<boolean> {
    const url = `${environment.API_URL}/user/checkUsername/${username}`;
    try {
      const data: any = await this.http.get(url).toPromise();
      return data;
    } catch (error) {
      return false;
    }
  }

  logout() {
    if (this.googleLoginSession) this._authGoogleService.logout();
    localStorage.removeItem('token');
    localStorage.removeItem('googleLogin');
    this._router.navigate(['/auth']);
  }

}
