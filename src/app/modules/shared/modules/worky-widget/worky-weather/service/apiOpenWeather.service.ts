import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { WeatherMain } from '../interfaces/dataWeather.interface';

@Injectable({
    providedIn: 'root'
})
export class WeatherService {
    private apiKey = environment.APIWEATHERTOKEN;
    private apiUrl =  environment.APIWEATHERURL;

    constructor(private http: HttpClient) { }

    getWeatherLatAndLng(lat: number, lng: number): Observable<WeatherMain> {
        const url = `${this.apiUrl}?key=${this.apiKey}&q=${lat},${lng}&days=3&lang=es`;
        return this.http.get<WeatherMain>(url)
    }

    getWeatherCity(city: string): Observable<WeatherMain> {
        const url = `${this.apiUrl}?key=${this.apiKey}&q=${city}&days=3&lang=es`;
        return this.http.get<WeatherMain>(url)
    }

}
