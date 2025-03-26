import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';

export enum LevelLogEnum {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  DEBUG = 'debug',
}

@Injectable({
  providedIn: 'root'
})
export class LogService {
  private _url: string;

  private _apiUrl: string;

  private _logs: any[] = [];

  private _timer: NodeJS.Timeout | null = null;

  private destroy$ = new Subject<void>();

  constructor(private http: HttpClient) {
    this._url = environment.API_URL;
    this._apiUrl = `${this._url}/records-logs/batch`;
  }

  log(level: LevelLogEnum, context: string, message: string, metadata?: Record<string, any>) {
    const logEntry = {
      level,
      context,
      message : `FRONT: ${message}`,
      metadata,
      timestamp: new Date().toISOString(),
    };

    this._logs.push(logEntry);

    if (!this._timer) {
      // Send logs every 30 seconds
      this._timer = setTimeout(() => this.sendLogs(), 30000);
    }
  }

  private sendLogs() {
    if (this._logs.length === 0) return;

    const logsToSend = [...this._logs];

    try {
      this._logs = [];

      this.http.post(this._apiUrl, { logs: logsToSend }).pipe(takeUntil(this.destroy$)).subscribe();

    } catch (error) {
      console.error('Error al enviar logs:', error);
      // yes, we need to send the logs again
      this._logs = [...logsToSend, ...this._logs];
    } finally {
      // Reset the timer
      this._timer = null;
    }
  }
}
