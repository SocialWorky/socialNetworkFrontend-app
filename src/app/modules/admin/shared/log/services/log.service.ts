import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';
import { LogsList } from '../interface/log.interface';

@Injectable({
  providedIn: 'root'
})
export class LogService {

  urlApi = `${environment.API_URL}/records-logs`;

  constructor(
    private _http: HttpClient,
  ) { }

  getLogs(): Observable<LogsList[]> {
    return this._http.get<LogsList[]>(`${this.urlApi}/`);
  }
}
