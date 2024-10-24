import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, Subject, takeUntil, tap } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Socket } from 'ngx-socket-io';

import { environment } from '../../../../environments/environment';
import { Config } from '@shared/interfaces/config.interface';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private apiUrl: string;

  private token = localStorage.getItem('token');

  private configSubject = new BehaviorSubject<any>(null);

  private _unsubscribeAll = new Subject<void>();

  config$ = this.configSubject.asObservable();

  constructor(
    private http: HttpClient,
    private socket: Socket,
    private _router: Router
  ) {
    this.token = localStorage.getItem('token');
    if (!this.token) this._router.navigate(['/']);
    this.subscribeToNotification();
    this.apiUrl = environment.API_URL;
  }

  private getHeaders(): HttpHeaders {
    const token = this.token;
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return headers;
  }

  getConfig(): Observable<any> {
    const url = `${this.apiUrl}/config`;
    const headers = this.getHeaders();
    return this.http.get<any>(url, { headers });
  }

  updateConfig(config: Config): Observable<Config> {
    const url = `${this.apiUrl}/config`;
    const headers = this.getHeaders();
    return this.http.put<Config>(url, config, { headers }).pipe(
      tap((updatedConfig) => {
        this.socket.emit('updateConfig', updatedConfig);
        this.configSubject.next(updatedConfig);
      })
    );
  }

  setConfig(config: any) {
    this.socket.emit('updateConfig', config);
    this.configSubject.next(config);
  }

  private subscribeToNotification() {
    this.socket.fromEvent('updateConfig')
      .pipe(
        takeUntil(this._unsubscribeAll),
        catchError(error => {
          throw error;
        })
      )
      .subscribe((data: any) => {
        this.configSubject.next(data);
      });
  }
}
