import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { LoginData } from '../interfaces/login.interface';

@Injectable({
  providedIn: 'root'
})
export class AuthApiService {
  private baseUrl: string;

  constructor(private http: HttpClient) {
    this.baseUrl = environment.apiUrl;
  }

  loginUser(credentials: LoginData) {
    const url = `${this.baseUrl}/user/login`;
    return this.http.post(url, credentials);
  }

  validarCorreoConToken(token: string) {
    const url = `${this.baseUrl}/email/validate/${token}`;
    return this.http.post(url, {});
  }

}