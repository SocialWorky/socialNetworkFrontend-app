import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';
import { Logs } from '../interface/log.interface';

@Injectable({
  providedIn: 'root'
})
export class LogService {

  urlApi = `${environment.API_URL}/records-logs`;

  constructor(
    private _http: HttpClient,
  ) { }

  getLogs(page: number = 1, limit: number = 10): Observable<Logs> {
    return this._http.get<Logs>(`${this.urlApi}?page=${page}&limit=${limit}`);
  }
}
