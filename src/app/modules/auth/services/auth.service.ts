import { Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { Token } from '../../shared/interfaces/token.interface';
import { AuthGoogleService } from './auth-google.service';
import { UserService } from '../../shared/services/core-apis/users.service';

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
    private _userService: UserService
  ) {}

  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    if (token) {
      const decodedToken: any = jwtDecode(token);
      const currentTime = Math.floor(Date.now() / 1000);

      const currentUser = this._userService.getUserById(decodedToken._id);
      if (!currentUser) {
        this.clearSession();
        return false;
      }

      if (decodedToken && decodedToken.exp && (decodedToken.exp > currentTime)) {
        return true;
      } else {
        this.clearSession();
        return false;
      }
    } else {
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
    if (token) {
      return jwtDecode(token);
    } else {
      return null;
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

  private clearSession() {
    localStorage.clear();
    sessionStorage.clear();
    this.router.navigate(['/auth']);
  }
}
