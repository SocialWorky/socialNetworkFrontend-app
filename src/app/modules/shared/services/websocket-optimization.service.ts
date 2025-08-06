import { Injectable, OnDestroy } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { BehaviorSubject, Observable, Subject, timer, interval } from 'rxjs';
import { takeUntil, catchError, switchMap, tap } from 'rxjs/operators';
import { LogService, LevelLogEnum } from './core-apis/log.service';
import { ConnectionQualityService } from './connection-quality.service';

export interface WebSocketConfig {
  reconnectAttempts: number;
  reconnectDelay: number;
  heartbeatInterval: number;
  heartbeatTimeout: number;
  maxReconnectDelay: number;
  enableCompression: boolean;
}

export interface WebSocketMetrics {
  connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'reconnecting';
  reconnectAttempts: number;
  lastHeartbeat: number;
  averageLatency: number;
  messageCount: number;
  errorCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketOptimizationService implements OnDestroy {
  private destroy$ = new Subject<void>();
  private metrics$ = new BehaviorSubject<WebSocketMetrics>({
    connectionStatus: 'disconnected',
    reconnectAttempts: 0,
    lastHeartbeat: 0,
    averageLatency: 0,
    messageCount: 0,
    errorCount: 0
  });

  private readonly DEFAULT_CONFIG: WebSocketConfig = {
    reconnectAttempts: 5,
    reconnectDelay: 1000,
    heartbeatInterval: 30000, // 30 seconds
    heartbeatTimeout: 10000, // 10 seconds
    maxReconnectDelay: 30000, // 30 seconds
    enableCompression: true
  };

  private currentConfig: WebSocketConfig = { ...this.DEFAULT_CONFIG };
  private reconnectAttempts = 0;
  private heartbeatTimer: any;
  private reconnectTimer: any;
  private latencyMeasurements: number[] = [];

  constructor(
    private socket: Socket,
    private logService: LogService,
    private connectionQualityService: ConnectionQualityService
  ) {
    this.initializeService();
  }

  /**
   * Initialize service with connection monitoring
   */
  private initializeService(): void {
    this.setupConnectionMonitoring();
    this.setupHeartbeat();
    this.adaptToConnectionQuality();
    
    this.logService.log(LevelLogEnum.INFO, 'WebSocketOptimizationService', 'Service initialized', {
      config: this.currentConfig
    });
  }

  /**
   * Setup connection monitoring
   */
  private setupConnectionMonitoring(): void {
    // Monitor connection events
    this.socket.on('connect', () => {
      this.updateMetrics({ connectionStatus: 'connected', reconnectAttempts: 0 });
      this.logService.log(LevelLogEnum.INFO, 'WebSocketOptimizationService', 'WebSocket connected');
      this.startHeartbeat();
    });

    this.socket.on('disconnect', (reason: string) => {
      this.updateMetrics({ connectionStatus: 'disconnected' });
      this.logService.log(LevelLogEnum.WARN, 'WebSocketOptimizationService', 'WebSocket disconnected', { reason });
      this.handleDisconnection(reason);
    });

    this.socket.on('connect_error', (error: any) => {
      this.updateMetrics({ 
        connectionStatus: 'connecting', 
        errorCount: this.metrics$.value.errorCount + 1 
      });
      this.logService.log(LevelLogEnum.ERROR, 'WebSocketOptimizationService', 'Connection error', { error });
    });
  }

  /**
   * Setup heartbeat mechanism
   */
  private setupHeartbeat(): void {
    this.socket.on('pong', (latency: number) => {
      this.latencyMeasurements.push(latency);
      this.updateMetrics({ 
        lastHeartbeat: Date.now(),
        averageLatency: this.calculateAverageLatency()
      });
    });
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.socket.connected) {
        this.socket.emit('ping');
        
        // Set timeout for pong response
        setTimeout(() => {
          const lastHeartbeat = this.metrics$.value.lastHeartbeat;
          const now = Date.now();
          
          if (now - lastHeartbeat > this.currentConfig.heartbeatTimeout) {
            this.logService.log(LevelLogEnum.WARN, 'WebSocketOptimizationService', 'Heartbeat timeout');
            this.handleDisconnection('heartbeat_timeout');
          }
        }, this.currentConfig.heartbeatTimeout);
      }
    }, this.currentConfig.heartbeatInterval);
  }

  /**
   * Handle disconnection with intelligent reconnection
   */
  private handleDisconnection(reason: string): void {
    this.stopHeartbeat();
    
    if (this.reconnectAttempts < this.currentConfig.reconnectAttempts) {
      this.reconnectAttempts++;
      this.updateMetrics({ 
        connectionStatus: 'reconnecting',
        reconnectAttempts: this.reconnectAttempts
      });
      
      const delay = this.calculateReconnectDelay();
      
      this.logService.log(LevelLogEnum.INFO, 'WebSocketOptimizationService', 'Attempting reconnection', {
        attempt: this.reconnectAttempts,
        delay,
        reason
      });
      
      this.reconnectTimer = setTimeout(() => {
        this.socket.connect();
      }, delay);
    } else {
      this.logService.log(LevelLogEnum.ERROR, 'WebSocketOptimizationService', 'Max reconnection attempts reached');
      this.updateMetrics({ connectionStatus: 'disconnected' });
    }
  }

  /**
   * Calculate reconnect delay with exponential backoff
   */
  private calculateReconnectDelay(): number {
    const baseDelay = this.currentConfig.reconnectDelay;
    const exponentialDelay = baseDelay * Math.pow(2, this.reconnectAttempts - 1);
    const jitter = Math.random() * 1000; // Add random jitter
    
    return Math.min(exponentialDelay + jitter, this.currentConfig.maxReconnectDelay);
  }

  /**
   * Adapt configuration based on connection quality
   */
  private adaptToConnectionQuality(): void {
    const connectionInfo = this.connectionQualityService.getConnectionInfo();
    
    switch (connectionInfo.effectiveType) {
      case 'slow-2g':
      case '2g':
        this.currentConfig = {
          ...this.DEFAULT_CONFIG,
          reconnectAttempts: 3,
          reconnectDelay: 2000,
          heartbeatInterval: 60000, // 1 minute
          heartbeatTimeout: 15000,
          maxReconnectDelay: 60000
        };
        break;
      case '3g':
        this.currentConfig = {
          ...this.DEFAULT_CONFIG,
          reconnectAttempts: 4,
          reconnectDelay: 1500,
          heartbeatInterval: 45000, // 45 seconds
          heartbeatTimeout: 12000
        };
        break;
      case '4g':
        this.currentConfig = {
          ...this.DEFAULT_CONFIG,
          reconnectAttempts: 5,
          reconnectDelay: 1000,
          heartbeatInterval: 30000, // 30 seconds
          heartbeatTimeout: 10000
        };
        break;
      default:
        this.currentConfig = { ...this.DEFAULT_CONFIG };
    }
  }

  /**
   * Optimized emit with compression and error handling
   */
  emit(event: string, data?: any): void {
    try {
      if (this.socket.connected) {
        this.socket.emit(event, data);
        this.updateMetrics({ messageCount: this.metrics$.value.messageCount + 1 });
        
        this.logService.log(LevelLogEnum.INFO, 'WebSocketOptimizationService', 'Message emitted', {
          event,
          dataSize: data ? JSON.stringify(data).length : 0
        });
      } else {
        this.logService.log(LevelLogEnum.WARN, 'WebSocketOptimizationService', 'Cannot emit - not connected', { event });
      }
    } catch (error) {
      this.logService.log(LevelLogEnum.ERROR, 'WebSocketOptimizationService', 'Emit failed', { event, error });
    }
  }

  /**
   * Optimized event listener with error handling
   */
  fromEvent<T>(event: string): Observable<T> {
    return this.socket.fromEvent<T>(event).pipe(
      tap(() => {
        this.updateMetrics({ messageCount: this.metrics$.value.messageCount + 1 });
      }),
      catchError(error => {
        this.updateMetrics({ errorCount: this.metrics$.value.errorCount + 1 });
        this.logService.log(LevelLogEnum.ERROR, 'WebSocketOptimizationService', 'Event listener error', { event, error });
        throw error;
      })
    );
  }

  /**
   * Force reconnection
   */
  forceReconnect(): void {
    this.logService.log(LevelLogEnum.INFO, 'WebSocketOptimizationService', 'Force reconnection requested');
    this.reconnectAttempts = 0;
    this.socket.disconnect();
    this.socket.connect();
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.socket.connected;
  }

  /**
   * Get current metrics
   */
  getMetrics(): Observable<WebSocketMetrics> {
    return this.metrics$.asObservable();
  }

  /**
   * Get current configuration
   */
  getConfig(): WebSocketConfig {
    return { ...this.currentConfig };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<WebSocketConfig>): void {
    this.currentConfig = { ...this.currentConfig, ...newConfig };
    this.logService.log(LevelLogEnum.INFO, 'WebSocketOptimizationService', 'Configuration updated', this.currentConfig);
  }

  /**
   * Update metrics
   */
  private updateMetrics(updates: Partial<WebSocketMetrics>): void {
    const currentMetrics = this.metrics$.value;
    this.metrics$.next({ ...currentMetrics, ...updates });
  }

  /**
   * Calculate average latency
   */
  private calculateAverageLatency(): number {
    if (this.latencyMeasurements.length === 0) return 0;
    
    const sum = this.latencyMeasurements.reduce((acc, val) => acc + val, 0);
    return sum / this.latencyMeasurements.length;
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.metrics$.complete();
  }
} 