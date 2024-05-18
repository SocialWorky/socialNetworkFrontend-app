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

  reverseGeocode(lat: number, lng: number): Observable<any> {
    const apiKey = environment.OPENCAGEAPIKEY;
    const url = `${this.apiUrl}?q=${lat}+${lng}&key=${apiKey}`;
    return this.http.get<any>(url);
  }
}
