import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { LogService, LevelLogEnum } from './core-apis/log.service';
import { AuthService } from '@auth/services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class NetworkService {
  private connectionStatus$ = new BehaviorSubject<boolean>(navigator.onLine);
  private connectionSpeed$ = new BehaviorSubject<string>('unknown');

  private testImageUrl = 'https://static.vecteezy.com/system/resources/previews/004/948/022/non_2x/flat-illustration-of-internet-speed-test-gauge-suitable-for-design-element-of-internet-performance-test-connection-speed-information-and-network-speedometer-free-vector.jpg';

  constructor(
    private logService: LogService,
    private authService: AuthService
  ) {
    this.initNetworkStatusListener();
    this.checkConnectionSpeed();
  }

  private initNetworkStatusListener() {
    window.addEventListener('online', () => this.updateOnlineStatus(true));
    window.addEventListener('offline', () => this.updateOnlineStatus(false));
  }

  private updateOnlineStatus(status: boolean) {
    this.connectionStatus$.next(status);
    
    const user = this.authService.getDecodedToken();
    this.logService.log(
      LevelLogEnum.INFO,
      'NetworkService',
      'Network status changed',
      { 
        isOnline: status,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        userId: user?.id,
        username: user?.username
      }
    );
    
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
      const response = await fetch(this.testImageUrl, { method: 'HEAD' });
      if (!response.ok) throw new Error('Network response was not ok');
      const endTime = Date.now();
      const duration = endTime - startTime;
      const fileSize = parseInt(response.headers.get('content-length') || '0', 10);

      if (fileSize > 0) {
        const speedBps = (fileSize * 8) / (duration / 1000);
        const speedKbps = speedBps / 1024;

        let speedCategory: string;
        if (speedKbps < 256) {
          speedCategory = 'slow';
        } else {
          speedCategory = 'fast';
        }
        
        this.connectionSpeed$.next(speedCategory);
        
        const user = this.authService.getDecodedToken();
        this.logService.log(
          LevelLogEnum.INFO,
          'NetworkService',
          'Connection speed measured',
          { 
            speedKbps: Math.round(speedKbps),
            speedCategory,
            duration,
            fileSize,
            userAgent: navigator.userAgent,
            userId: user?.id,
            username: user?.username
          }
        );
      } else {
        this.connectionSpeed$.next('unknown');
      }
    } catch (error) {
      this.logService.log(
        LevelLogEnum.ERROR,
        'NetworkService',
        'Failed to check connection speed',
        { error: error instanceof Error ? error.message : String(error) }
      );
      this.connectionSpeed$.next('offline');
    }
  }
}
