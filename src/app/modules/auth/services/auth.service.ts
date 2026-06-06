import { Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { NetworkOptimizationService } from '@shared/services/network-optimization.service';

import { environment } from '@env/environment';
import { Token } from '../../shared/interfaces/token.interface';
import { AuthGoogleService } from './auth-google.service';
import { DatabaseCleanupService } from '@shared/services/database/database-cleanup.service';

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
    private logService: LogService,
    private databaseCleanup: DatabaseCleanupService,
    private networkOptimizationService: NetworkOptimizationService
  ) {}

  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');

    if (!token || token === 'undefined' || token === 'null') {
      this.clearSession();
      return false;
    }

    try {
      const decodedToken: any = jwtDecode(token);
      const currentTime = Math.floor(Date.now() / 1000);

      if (!decodedToken || !decodedToken.exp || decodedToken.exp <= currentTime) {
        this.clearSession();
        return false;
      }

      return true;
    } catch (error) {
      this.clearSession();
      return false;
    }
  }

  async renewToken(_id: string) {
    const token = localStorage.getItem('token');
    const url = `${environment.API_URL}/user/renewtoken/${_id}`;
    try {
      const response: any = await firstValueFrom(this.networkOptimizationService.get(url, { 
        headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
      }));
      
      const newToken = response;
      localStorage.setItem('token', newToken);
      return newToken;
    } catch (error) {
      // Failed to renew token - no need to log every token renewal failure
      throw error;
    }
  }

  getDecodedToken(): Token | null {
    const token = localStorage.getItem('token');
    if (!token || token === 'undefined' || token === 'null') {
      return null;
    }
    
    try {
      return jwtDecode(token);
    } catch (error) {
      this.logService.log(
        LevelLogEnum.ERROR,
        'AuthService',
        'Failed to decode token',
        { error: error instanceof Error ? error.message : String(error) }
      );
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
      const data: any = await firstValueFrom(this.networkOptimizationService.get(url));
      return data;
    } catch (error) {
      return false;
    }
  }

  logout() {
    const user = this.getDecodedToken();
    this.logService.log(
      LevelLogEnum.INFO,
      'AuthService',
      'User logout initiated',
      { userId: user?.id, email: user?.email }
    );
    
    this._authGoogleService.logout();
    this.clearSession();
  }

  clearSession() {
    // Get user info before clearing session to avoid recursion
    let userInfo: Token | null = null;
    try {
      const token = localStorage.getItem('token');
      if (token && token !== 'undefined' && token !== 'null') {
        userInfo = jwtDecode(token) as Token;
      }
    } catch (error) {
      // Ignore decode errors during session cleanup
    }
    
    this.logService.log(
      LevelLogEnum.INFO,
      'AuthService',
      'Session cleared',
      { userId: userInfo?.id, email: userInfo?.email }
    );
    
    // Clean up user databases before clearing session
    this.databaseCleanup.cleanupOnLogout();

    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiresAt');
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
      
      return this.networkOptimizationService.put(url, updateData);
    } catch (error) {
      return new Observable(observer => {
        observer.error(new Error('Invalid token format'));
      });
    }
  }
}
