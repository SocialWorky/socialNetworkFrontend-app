import { Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

import { environment } from '@env/environment';
import { Token } from '../../shared/interfaces/token.interface';
import { AuthGoogleService } from './auth-google.service';
import { UserService } from '../../shared/services/core-apis/users.service';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  googleLoginSession = localStorage.getItem('googleLogin');

  constructor(
    private router: Router,
    private http: HttpClient,
    private _authGoogleService: AuthGoogleService,
    private _router: Router,
    private _userService: UserService,
  ) {}

  async isAuthenticated(): Promise<boolean> {
    const token = localStorage.getItem('token');
    if (token && token !== 'undefined') {
      try {
        const decodedToken: any = jwtDecode(token);
        const currentTime = Math.floor(Date.now() / 1000);

        if (!decodedToken || !decodedToken.exp || decodedToken.exp <= currentTime) {
          this.clearSession();
          this._router.navigate(['/auth/login']);
          return false;
        }

        const user = await firstValueFrom(this._userService.getUserById(decodedToken.id));
        if (user) {
          return true;
        } else {
          this.clearSession();
          this._router.navigate(['/auth/login']);
          return false;
        }
      } catch (error) {
        console.error('Error verifying authentication:', error);
        this.clearSession();
        this._router.navigate(['/auth/login']);
        return false;
      }
    } else {
      this.clearSession();
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

  getDecodedToken(): Token | null {
    const token = localStorage.getItem('token');
    if (!token || token === 'undefined') {
      this._router.navigate(['/auth/login']);
      this.clearSession();
      return null;
    }
    return jwtDecode(token);
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
      counter++;
    }
    return username;
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
    this._authGoogleService.logout();
    this.clearSession();
  }

  clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('lastLogin');
    sessionStorage.clear();
    this.router.navigate(['/auth']);
  }

  validateEmail(token: string): Observable<any> {
    // Decode the JWT token to get user information
    try {
      const decodedToken: any = jwtDecode(token);
      const userId = decodedToken.id;
      
      // Use the user update endpoint to mark email as verified
      const url = `${environment.API_URL}/user/edit/${userId}`;
      const updateData = {
        isVerified: true
      };
      
      return this.http.put(url, updateData);
    } catch (error) {
      return new Observable(observer => {
        observer.error(new Error('Invalid token format'));
      });
    }
  }
}
