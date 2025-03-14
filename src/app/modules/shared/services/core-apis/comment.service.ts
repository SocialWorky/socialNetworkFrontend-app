import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { environment } from '../../../../../environments/environment';
import { CreateComment } from '../../interfaces/addComment.interface';

@Injectable({
  providedIn: 'root'
})
export class CommentService {

  private baseUrl: string;

  constructor(private http: HttpClient) {
    this.baseUrl = environment.API_URL;
  }

  createComment(comment: CreateComment) {
    const url = `${this.baseUrl}/comments/create`;
    return this.http.post(url, comment);
  }

  deletComment(id: string) {
    const url = `${this.baseUrl}/comments/${id}`;
    return this.http.delete(url);
  }

}
