import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { environment } from '../../../../environments/environment';
import { Config } from '@shared/interfaces/config.interface';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  private apiUrl: string;
  private token: string;

  constructor(private http: HttpClient) {
    this.apiUrl = environment.API_URL;
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
    const url = `${this.apiUrl}/config`;
    const headers = this.getHeaders();
    return this.http.get<any>(url, { headers });
  }

  updateConfig(config: Config): Observable<Config> {
    const url = `${this.apiUrl}/config`;
    const headers = this.getHeaders();
    return this.http.put<Config>(url, config, { headers });
  }
}
