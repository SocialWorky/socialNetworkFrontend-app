import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, Subject, takeUntil, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Socket } from 'ngx-socket-io';

import { environment } from '../../../../environments/environment';
import { Config, ConfigServiceInterface } from '@shared/interfaces/config.interface';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private apiUrl: string;

  private configSubject = new BehaviorSubject<any>(null);

  private _unsubscribeAll = new Subject<void>();

  config$ = this.configSubject.asObservable();

  constructor(
    private http: HttpClient,
    private socket: Socket,
    private _router: Router
  ) {
    this.subscribeToNotification();
    this.apiUrl = environment.API_URL;
  }

  getConfig(): Observable<any> {
    const url = `${this.apiUrl}/config`;
    return this.http.get<any>(url);
  }

  getConfigServices(): Observable<ConfigServiceInterface> {
    const url = `${this.apiUrl}/config/services`;
    return this.http.get<ConfigServiceInterface>(url);
  }

  updateConfig(config: Config): Observable<Config> {
    const url = `${this.apiUrl}/config`;
    return this.http.put<Config>(url, config).pipe(
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
