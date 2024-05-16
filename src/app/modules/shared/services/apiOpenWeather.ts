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
        return this.http.get<any>(url).pipe(
            map(response => {
              // Asegúrate de que la respuesta incluya los campos necesarios
                if (response && response.dt && response.timezone) {
                // Convertir el timestamp Unix a milisegundos y crear un objeto Date
                    const utcDate = new Date(response.dt * 1000);
                
                // Ajustar la fecha y hora según el desplazamiento de la zona horaria
                    const localDate = new Date(utcDate.getTime() + response.timezone * 1000);
                
                // Agregar la hora local al objeto de respuesta
                    response.localTime = localDate;
                }
                return response;
            })
        );;
    }
}
