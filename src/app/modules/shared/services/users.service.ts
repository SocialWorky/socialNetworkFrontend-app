import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { environment } from '@env/environment';
import { CreatePost } from '@shared/modules/addPublication/interfaces/createPost.interface';
import { PublicationView } from '@shared/interfaces/publicationView.interface';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {

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

  searchUsers(limit?: number): Observable<any> {
    const url = `${this.baseUrl}/user?limit=${limit}`;
    const headers = this.getHeaders();
    return this.http.get(url, { headers });
  }

  getAllUsers(): Observable<any> {
    const url = `${this.baseUrl}/user`;
    const headers = this.getHeaders();
    return this.http.get(url, { headers });
  }

}
