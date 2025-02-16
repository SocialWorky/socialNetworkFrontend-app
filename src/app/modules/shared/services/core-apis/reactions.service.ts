import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { HttpClient } from '@angular/common/http';

import { environment } from 'src/environments/environment';
import { AddReaction } from '../../interfaces/reactions.interface';

@Injectable({
  providedIn: 'root'
})
export class ReactionsService {

  private baseUrl: string;

  constructor(private http: HttpClient) {
    this.baseUrl = environment.API_URL;
  }

  createReaction(data: AddReaction): Observable<AddReaction> {
    const url = `${this.baseUrl}/reactions/create`;
    return this.http.post<AddReaction>(url, data);
  }

  editReaction(id: string, data: AddReaction): Observable<AddReaction> {
    const url = `${this.baseUrl}/reactions/edit/${id}`;
    return this.http.put<AddReaction>(url, data);
  }

  deleteReaction(id: string): Observable<AddReaction> {
    const url = `${this.baseUrl}/reactions/delete/${id}`;
    return this.http.delete<AddReaction>(url);
  }

}
