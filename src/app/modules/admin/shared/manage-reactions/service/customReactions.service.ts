import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { environment } from 'src/environments/environment';
import { CreateCustomReaction, CustomReactionList } from '@admin/interfaces/customReactions.interface';



@Injectable({
  providedIn: 'root'
})
export class CustomReactionsService {

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

  createCustomReaction(data: CreateCustomReaction): Observable<CreateCustomReaction> {
    const url = `${this.baseUrl}/custom-reactions/create`;
    const headers = this.getHeaders();
    return this.http.post<CreateCustomReaction>(url, data, { headers });
  }

  getCustomReactionsAll(): Observable<CustomReactionList[]> {
    const url = `${this.baseUrl}/custom-reactions`;
    const headers = this.getHeaders();
    return this.http.get<CustomReactionList[]>(url, { headers });
  }

  deleteCustomReaction(id: string): Observable<CustomReactionList> {
    const url = `${this.baseUrl}/custom-reactions/delete/${id}`;
    const headers = this.getHeaders();
    return this.http.delete<CustomReactionList>(url, { headers });
  }

  uploadFile(formData: FormData): Observable<string> {
    const url = `${this.baseUrl}/upload`;
    const headers = this.getHeaders();
    return this.http.post<string>(url, formData, { headers });
  }

}
