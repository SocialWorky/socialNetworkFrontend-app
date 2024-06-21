import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '@env/environment';
import { LoginData, LoginDataGloogle } from '../interfaces/login.interface';
import { MailSendValidateData } from '@shared/interfaces/mail.interface';

@Injectable({
  providedIn: 'root'
})
export class AuthApiService {
  private baseUrl: string;

  private token: string;

  private getHeaders(token: string): HttpHeaders {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return headers;
  }

  constructor(private http: HttpClient) {
    this.baseUrl = environment.API_URL;
    this.token = localStorage.getItem('token') || '';
  }

  loginUser(credentials: LoginData) {
    const url = `${this.baseUrl}/user/login`;
    return this.http.post(url, credentials);
  }

  loginGoogle(data: LoginDataGloogle ) {
    const url = `${this.baseUrl}/user/loginGoogle`;
    return this.http.post(url, data);
  }

  validateEmailWithToken(token: string) {
    const url = `${this.baseUrl}/email/validate/${token}`;
    return this.http.post(url, {});
  }

  forgotPassword(data: MailSendValidateData) {
    const url = `${this.baseUrl}/email/forgotPassword`;
    return this.http.post(url, data);
  }

  resetPassword(data: MailSendValidateData) {
    const url = `${this.baseUrl}/email/resetPassword`;
    return this.http.post(url, data);
  }

  avatarUpdate(_id: string , avatar: string, tokenResponse: any) {
    const url = `${this.baseUrl}/user/edit/${_id}`;
    const headers = this.getHeaders(tokenResponse);
    return this.http.put(url, { avatar }, { headers });
  }

}
