import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { StreetMapData } from '../../interfaces/streetMap.interface';
import { CreateLocationRequest } from '../../interfaces/apiGeoLocations.interface';
import { environment } from '@env/environment'
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GeoLocationsService {

  private baseUrl: string;

  constructor(private http: HttpClient) {
    this.baseUrl = environment.APIGEOLOCATIONS;
  }

  createLocations(post: StreetMapData) {
    const url = `${this.baseUrl}/locations`;

    const requestBody: CreateLocationRequest = {
        lat: post.results[0].geometry.lat,
        lng: post.results[0].geometry.lng,
        mapUrl: post.results[0].annotations.OSM.url ? post.results[0].annotations.OSM.url : '',
        flag: post.results[0].annotations.flag ? post.results[0].annotations.flag : '',
        country: post.results[0].components.country ? post.results[0].components.country : '',
        state: post.results[0].components.state ? post.results[0].components.state : '',
        city: post.results[0].components.city ? post.results[0].components.city : '',
        suburb: post.results[0].components.suburb ? post.results[0].components.suburb : '',
        building: post.results[0].components.building ? post.results[0].components.building : '',
        road: post.results[0].components.road ? post.results[0].components.road : '',
        house_number: post.results[0].components.house_number ? post.results[0].components.house_number : '',
        countryCode: post.results[0].components.country_code ? post.results[0].components.country_code : '',
        county: post.results[0].components.county ? post.results[0].components.county : '',
        formatted: post.results[0].formatted ? post.results[0].formatted : '',
      };

    return this.http.post(url, requestBody);
  }

  findLocationByLatAndLng(lat: number, lng: number): Observable<any> {
    const url = `${this.baseUrl}/locations/${lat}/${lng}`;
    return this.http.get<any>(url);
  }

  findLocationByCity(city: string): Observable<any> {
    const url = `${this.baseUrl}/locations/${city}`;
    return this.http.get<any>(url);
  }

}
