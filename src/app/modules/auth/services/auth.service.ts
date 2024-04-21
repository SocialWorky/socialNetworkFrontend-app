import { Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private router: Router) {}

  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');

    if (token) {
      const decodedToken: any = jwtDecode(token);
      const currentTime = Math.floor(Date.now() / 1000);

      if (decodedToken && decodedToken.exp && decodedToken.exp > currentTime) {
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

  getDecodedToken(): any {
    const token = localStorage.getItem('token');
    return token ? jwtDecode(token) : null;
  }

}