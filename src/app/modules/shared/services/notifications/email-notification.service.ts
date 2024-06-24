import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '@env/environment'
import { MailSendValidateData } from '@shared/interfaces/mail.interface';

@Injectable({
  providedIn: 'root'
})
export class EmailNotificationService {
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

  sendNotification(data: MailSendValidateData) {
    const url = `${this.baseUrl}/email/sendNotification`;
    const headers = this.getHeaders(this.token);
    return this.http.post(url, data, { headers });
  }

}
