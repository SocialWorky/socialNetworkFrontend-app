import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  private baseUrl: string;
  private token: string;

  constructor(private http: HttpClient) {
    this.baseUrl = environment.APIMESSAGESERVICE;
    this.token = localStorage.getItem('token') || '';
  }

  private getHeaders(): HttpHeaders {
    const token = this.token;
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return headers;
  }

  getUserForMessage(_id: string): Observable<any> {
    const url = `${this.baseUrl}/messages/userformessage/${_id}`;
    const headers = this.getHeaders();
    return this.http.get<any>(url, { headers }); 
  }

  getFriendsPending(
    _id: string,
    _idRequest: string
  ): Observable<{ status: boolean; _id: string }> {
    const url = `${this.baseUrl}/user/pending-friend/${_id}/${_idRequest}`;
    const headers = this.getHeaders();
    return this.http.get<{ status: boolean; _id: string }>(url, { headers });
  }
}
