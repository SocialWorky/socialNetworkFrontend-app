import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { NewsArticle } from '../interface/dataNews.interface';
import { environment } from '@env/environment';


@Injectable({
    providedIn: 'root'
})
export class NewsService {
    private apiUrl = `${environment.APIGEOLOCATIONS}/news`;

    constructor(private http: HttpClient) {}

    getNews(date: string): Observable<NewsArticle[]> {
      return this.http.get<NewsArticle[]>(`${this.apiUrl}/${date}`);
    }

    getFetchNews(): Observable<any> {
      return this.http.get<NewsArticle[]>(`${this.apiUrl}/fetch`);
    }
}
