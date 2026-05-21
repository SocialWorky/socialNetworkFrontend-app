import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent, merge } from 'rxjs';
import { debounceTime, map } from 'rxjs/operators';
import { LogService, LevelLogEnum } from './core-apis/log.service';
import { AuthService } from '@auth/services/auth.service';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root',
})
export class NetworkService {
  // Start as true: if the app loaded, there was internet. navigator.onLine is unreliable on macOS/Chrome.
  private connectionStatus$ = new BehaviorSubject<boolean>(true);
  private connectionSpeed$ = new BehaviorSubject<string>('unknown');

  private readonly pingUrl = `${environment.API_URL}/health`;

  constructor(
    private logService: LogService,
    private authService: AuthService
  ) {
    this.initNetworkStatusListener();
    this.checkConnectionSpeed();
  }

  private initNetworkStatusListener() {
    merge(
      fromEvent(window, 'online').pipe(map(() => true)),
      // Debounce offline events to ignore brief blips (macOS sleep/wake, VPN, network switch).
      // Then verify with a real HTTP ping before declaring offline.
      fromEvent(window, 'offline').pipe(debounceTime(3000), map(() => false))
    ).subscribe(async (isOnline) => {
      if (isOnline) {
        this.updateOnlineStatus(true);
      } else {
        // Verify with a real HTTP check — navigator.onLine is not reliable
        const confirmed = await this.pingBackend();
        if (!confirmed) {
          this.updateOnlineStatus(false);
        }
        // If ping succeeds, the browser was wrong about being offline — ignore the event
      }
    });
  }

  private async pingBackend(): Promise<boolean> {
    try {
      const response = await fetch(this.pingUrl, {
        method: 'HEAD',
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private updateOnlineStatus(status: boolean) {
    this.connectionStatus$.next(status);

    if (status) {
      this.checkConnectionSpeed();
    } else {
      this.connectionSpeed$.next('offline');
    }
  }

  get connectionStatus(): Observable<boolean> {
    return this.connectionStatus$.asObservable().pipe(debounceTime(300));
  }

  get connectionSpeed(): Observable<string> {
    return this.connectionSpeed$.asObservable().pipe(debounceTime(300));
  }

  private async checkConnectionSpeed() {
    const startTime = Date.now();
    try {
      const response = await fetch(this.pingUrl, { method: 'HEAD', cache: 'no-store' });
      if (!response.ok) throw new Error('Network response was not ok');
      const endTime = Date.now();
      const duration = endTime - startTime;
      const fileSize = parseInt(response.headers.get('content-length') || '0', 10);

      if (fileSize > 0) {
        const speedBps = (fileSize * 8) / (duration / 1000);
        const speedKbps = speedBps / 1024;
        this.connectionSpeed$.next(speedKbps < 256 ? 'slow' : 'fast');
      } else {
        // No content-length — use round-trip time as proxy
        this.connectionSpeed$.next(duration > 1000 ? 'slow' : 'fast');
      }
    } catch (error) {
      this.logService.log(
        LevelLogEnum.ERROR,
        'NetworkService',
        'Failed to check connection speed',
        { error: error instanceof Error ? error.message : String(error) }
      );
      this.connectionSpeed$.next('unknown');
    }
  }
}
