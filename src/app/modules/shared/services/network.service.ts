import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class NetworkService {
  private connectionStatus$ = new BehaviorSubject<boolean>(navigator.onLine);
  private connectionSpeed$ = new BehaviorSubject<string>('unknown');

  private testImageUrl = 'https://static.vecteezy.com/system/resources/previews/004/948/022/non_2x/flat-illustration-of-internet-speed-test-gauge-suitable-for-design-element-of-internet-performance-test-connection-speed-information-and-network-speedometer-free-vector.jpg';

  constructor() {
    this.initNetworkStatusListener();
    this.checkConnectionSpeed();
  }

  private initNetworkStatusListener() {
    window.addEventListener('online', () => this.updateOnlineStatus(true));
    window.addEventListener('offline', () => this.updateOnlineStatus(false));
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
      const response = await fetch(this.testImageUrl, { method: 'HEAD' });
      if (!response.ok) throw new Error('Network response was not ok');
      const endTime = Date.now();
      const duration = endTime - startTime;
      const fileSize = parseInt(response.headers.get('content-length') || '0', 10);

      if (fileSize > 0) {
        const speedBps = (fileSize * 8) / (duration / 1000);
        const speedKbps = speedBps / 1024;

        if (speedKbps < 256) {
          this.connectionSpeed$.next('slow');
        } else {
          this.connectionSpeed$.next('fast');
        }
      } else {
        this.connectionSpeed$.next('unknown');
      }
    } catch (error) {
      console.error('Error checking connection speed:', error);
      this.connectionSpeed$.next('offline');
    }
  }
}
