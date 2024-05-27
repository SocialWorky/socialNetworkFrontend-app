import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { environment } from '../../../../environments/environment';
import { Config } from '@shared/interfaces/config.interface';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  private baseUrl: string;
  private token: string;

  constructor(private http: HttpClient) {
    this.baseUrl = environment.API_URL;
    this.token = localStorage.getItem('token') || '';
  }

  private getHeaders(): HttpHeaders {
    const token = this.token;
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return headers;
  }

  getConfig() {
    const url = `${this.baseUrl}/config`;
    const headers = this.getHeaders();
    return this.http.get<any>(url, { headers });
  }

  updateConfig(config: Config): Observable<Config> {
    const url = `${this.baseUrl}/config`;
    const headers = this.getHeaders();
    return this.http.put<Config>(url, config, { headers });
  }
}
