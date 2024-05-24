import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { NewsResponse } from '../interface/dataNews.interface';


@Injectable({
    providedIn: 'root'
})
export class NewsService {
    private apiUrl = 'https://newsapi.org/v2/top-headlines';
    private apiKey = 'b622b6a2f70745199032c7267f98df6b'; // Reemplaza con tu API key de NewsAPI b622b6a2f70745199032c7267f98df6b

    constructor(private http: HttpClient) {}

    getTopSportsHeadlines(): Observable<NewsResponse> {
        return this.http.get<NewsResponse>(`${this.apiUrl}?sources=bbc-news&apiKey=${this.apiKey}`);
    }
}
