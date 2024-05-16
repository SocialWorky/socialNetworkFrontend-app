import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class WeatherService {
    private apiKey = '37f156be79fb9ed3d57f5ae30215ec9e';
    private apiUrl = 'https://api.openweathermap.org/data/2.5/weather';

    constructor(private http: HttpClient) { }

    getWeather(city: string): Observable<any> {
        const url = `${this.apiUrl}?q=${city}&units=metric&appid=${this.apiKey}`;
        return this.http.get<any>(url)
    }
}
