import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { environment } from 'src/environments/environment';
import { AddReaction } from '../interfaces/reactions.interface';



@Injectable({
  providedIn: 'root'
})
export class ReactionsService {

  private baseUrl: string;
  private token: string;

  constructor(private http: HttpClient) {
    this.baseUrl = environment.API_URL;
    this.token = localStorage.getItem('token') || '';
  }

  private getHeaders(): HttpHeaders {
    const token = this.token;
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return headers;
  }

  createReaction(data: AddReaction): Observable<AddReaction> {
    const url = `${this.baseUrl}/reactions/create`;
    const headers = this.getHeaders();
    return this.http.post<AddReaction>(url, data, { headers });
  }

  editReaction(id: string, data: AddReaction): Observable<AddReaction> {
    const url = `${this.baseUrl}/reactions/edit/${id}`;
    const headers = this.getHeaders();
    return this.http.put<AddReaction>(url, data, { headers });
  }

  deleteReaction(id: string): Observable<AddReaction> {
    const url = `${this.baseUrl}/reactions/delete/${id}`;
    const headers = this.getHeaders();
    return this.http.delete<AddReaction>(url, { headers });
  }

}
