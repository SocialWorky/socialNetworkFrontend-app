import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NewsArticle } from '../interface/dataNews.interface';
import { environment } from '@env/environment';


@Injectable({
    providedIn: 'root'
})
export class NewsService {
    private apiUrl = `${environment.APIGEOLOCATIONS}/news`;

    constructor(private http: HttpClient) {}

    getNews(date: string): Observable<NewsArticle[]> {
      return this.http.get<NewsArticle[]>(`${this.apiUrl}/${date}`).pipe(
        catchError(error => {
          // Return empty array if service is unavailable
          // Error is already handled by ExternalServiceErrorInterceptor
          return of([]);
        })
      );
    }

    getFetchNews(): Observable<any> {
      return this.http.get<NewsArticle[]>(`${this.apiUrl}/fetch`).pipe(
        catchError(error => {
          // Return empty array if service is unavailable
          // Error is already handled by ExternalServiceErrorInterceptor
          return of([]);
        })
      );
    }
}
