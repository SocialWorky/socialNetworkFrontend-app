import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { LogService, LevelLogEnum } from './core-apis/log.service';

export interface ConnectionInfo {
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  downlink: number;
  rtt: number;
  saveData: boolean;
  quality: 'slow' | 'medium' | 'fast';
}

@Injectable({
  providedIn: 'root'
})
export class ConnectionQualityService {
  private connectionSubject = new BehaviorSubject<ConnectionInfo>({
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    saveData: false,
    quality: 'fast'
  });

  connection$ = this.connectionSubject.asObservable();
  private monitoringInterval: any;

  constructor(private logService: LogService) {
    this.initializeConnectionMonitoring();
  }

  getConnectionInfo(): ConnectionInfo {
    return this.connectionSubject.value;
  }

  getConnectionQuality(): Observable<'slow' | 'medium' | 'fast'> {
    return this.connection$.pipe(
      map(info => info.quality)
    );
  }

  isSlowConnection(): boolean {
    const info = this.getConnectionInfo();
    return info.quality === 'slow' || info.saveData;
  }

  getOptimizedMediaOptions(): {
    quality: 'low' | 'medium' | 'high';
    timeout: number;
    maxRetries: number;
    retryDelay: number;
  } {
    const info = this.getConnectionInfo();
    
    switch (info.quality) {
      case 'slow':
        return {
          quality: 'low',
          timeout: 45000,
          maxRetries: 5,
          retryDelay: 3000
        };
      case 'medium':
        return {
          quality: 'medium',
          timeout: 30000,
          maxRetries: 3,
          retryDelay: 2000
        };
      case 'fast':
      default:
        return {
          quality: 'high',
          timeout: 15000,
          maxRetries: 2,
          retryDelay: 1000
        };
    }
  }

  startMonitoring(): void {
    if (this.monitoringInterval) {
      return;
    }

    this.monitoringInterval = interval(10000).pipe(
      startWith(0)
    ).subscribe(() => {
      this.updateConnectionInfo();
    });

    this.logService.log(LevelLogEnum.INFO, 'ConnectionQualityService', 'Connection monitoring started');
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      this.monitoringInterval.unsubscribe();
      this.monitoringInterval = null;
      this.logService.log(LevelLogEnum.INFO, 'ConnectionQualityService', 'Connection monitoring stopped');
    }
  }

  private initializeConnectionMonitoring(): void {
    if ('connection' in navigator) {
      this.updateConnectionInfo();
      this.startMonitoring();
      
      (navigator as any).connection.addEventListener('change', () => {
        this.updateConnectionInfo();
      });
    } else {
      this.logService.log(LevelLogEnum.WARN, 'ConnectionQualityService', 'Network Information API not supported, using default values');
    }
  }

  private updateConnectionInfo(): void {
    let connectionInfo: ConnectionInfo;

    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connectionInfo = {
        effectiveType: connection.effectiveType || '4g',
        downlink: connection.downlink || 10,
        rtt: connection.rtt || 50,
        saveData: connection.saveData || false,
        quality: this.calculateQuality(connection)
      };
    } else {
      connectionInfo = {
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
        saveData: false,
        quality: 'fast'
      };
    }

    const previousQuality = this.connectionSubject.value.quality;
    this.connectionSubject.next(connectionInfo);

    if (previousQuality !== connectionInfo.quality) {
      this.logService.log(LevelLogEnum.INFO, 'ConnectionQualityService', 'Connection quality changed', {
        from: previousQuality,
        to: connectionInfo.quality,
        effectiveType: connectionInfo.effectiveType,
        downlink: connectionInfo.downlink,
        rtt: connectionInfo.rtt
      });
    }
  }

  private calculateQuality(connection: any): 'slow' | 'medium' | 'fast' {
    const downlink = connection.downlink || 10;
    const rtt = connection.rtt || 50;
    const saveData = connection.saveData || false;

    if (saveData) {
      return 'slow';
    }

    if (downlink < 1 || rtt > 200) {
      return 'slow';
    } else if (downlink < 5 || rtt > 100) {
      return 'medium';
    } else {
      return 'fast';
    }
  }
} 