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

  constructor(private http: HttpClient) {
    this.baseUrl = environment.API_URL;
  }

  createCustomReaction(data: CreateCustomReaction): Observable<CreateCustomReaction> {
    const url = `${this.baseUrl}/custom-reactions/create`;
    return this.http.post<CreateCustomReaction>(url, data);
  }

  getCustomReactionsAll(forceRefresh: boolean = false): Observable<CustomReactionList[]> {
    const url = `${this.baseUrl}/custom-reactions`;
    
    if (forceRefresh) {
      const timestamp = new Date().getTime();
      return this.http.get<CustomReactionList[]>(`${url}?t=${timestamp}`);
    }
    
    return this.http.get<CustomReactionList[]>(url);
  }

  updateCustomReaction(id: string, data: Partial<CreateCustomReaction>): Observable<CustomReactionList> {
    const url = `${this.baseUrl}/custom-reactions/update/${id}`;
    return this.http.put<CustomReactionList>(url, data);
  }

  deleteCustomReaction(id: string): Observable<CustomReactionList> {
    const url = `${this.baseUrl}/custom-reactions/delete/${id}`;
    return this.http.delete<CustomReactionList>(url);
  }

}
