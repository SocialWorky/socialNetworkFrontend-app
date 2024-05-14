import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { environment } from '../../../../environments/environment';
import { CreateComment } from '../interfaces/addComment.interface';

@Injectable({
  providedIn: 'root'
})
export class CommentService {

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

  createComment(comment: CreateComment) {
    const url = `${this.baseUrl}/comments/create`;
    const headers = this.getHeaders();
    return this.http.post(url, comment, { headers });
  }

}
