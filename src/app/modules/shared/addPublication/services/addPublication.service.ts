import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { environment } from '../../../../../environments/environment';
import { CreatePost } from '../interfaces/createPost.interface';
import { TypePublishing } from '../enum/addPublication.enum';

@Injectable({
  providedIn: 'root'
})
export class AddPublicationService {
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

  createPost(post: CreatePost) {
    const url = `${this.baseUrl}/publications/create`;
    const headers = this.getHeaders();
    return this.http.post(url, post, { headers });
  }

}
