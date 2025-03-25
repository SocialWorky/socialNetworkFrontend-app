import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '@env/environment';
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

  deleteComment(id: string) {
    const url = `${this.baseUrl}/comments/${id}`;
    return this.http.delete(url);
  }

}
