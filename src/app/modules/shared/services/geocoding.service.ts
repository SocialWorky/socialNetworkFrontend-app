import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GeocodingService {
  private apiUrl = `https://api.opencagedata.com/geocode/v1/json`;

  constructor(private http: HttpClient) {}

  getGeocodeLatAndLng(lat: number, lng: number): Observable<any> {
    const apiKey = environment.OPENCAGEAPIKEY;
    const url = `${this.apiUrl}?q=${lat},${lng}&key=${apiKey}&countrycode=cl&language=es`;
    return this.http.get<any>(url);
  }

  getGeocodeCity(city: string): Observable<any> {
    const apiKey = environment.OPENCAGEAPIKEY;
    const url = `${this.apiUrl}?q=${city}&key=${apiKey}&countrycode=cl&language=es&roadinfo=1&limit=25`;
    return this.http.get<any>(url);
  }
}
