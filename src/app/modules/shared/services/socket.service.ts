import { Injectable, OnDestroy } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { BehaviorSubject, Subject, fromEvent, merge, timer } from 'rxjs';
import { takeUntil, filter, take } from 'rxjs/operators';

export interface ConnectionState {
  connected: boolean;
  reconnecting: boolean;
  reconnectAttempt: number;
  lastConnected: Date | null;
  lastDisconnected: Date | null;
  error: string | null;
}

export interface ReconnectionConfig {
  initialDelay: number;
  maxDelay: number;
  multiplier: number;
  maxAttempts: number; // 0 = infinite
  jitterFactor: number;
}

const DEFAULT_RECONNECTION_CONFIG: ReconnectionConfig = {
  initialDelay: 1000,      // 1 second
  maxDelay: 30000,         // 30 seconds max
  multiplier: 1.5,         // Exponential factor
  maxAttempts: 0,          // Infinite attempts
  jitterFactor: 0.2        // 20% random jitter
};

@Injectable({
  providedIn: 'root',
})
export class SocketService implements OnDestroy {
  private _connectionState$ = new BehaviorSubject<ConnectionState>({
    connected: false,
    reconnecting: false,
    reconnectAttempt: 0,
    lastConnected: null,
    lastDisconnected: null,
    error: null
  });

  private _currentToken: string | null = null;
  private _reconnectConfig: ReconnectionConfig = DEFAULT_RECONNECTION_CONFIG;
  private _reconnectTimer: any = null;
  private _currentDelay = DEFAULT_RECONNECTION_CONFIG.initialDelay;
  private _isManualDisconnect = false;
  private _destroy$ = new Subject<void>();
  private _online$ = new BehaviorSubject<boolean>(navigator.onLine);

  constructor(private socket: Socket) {
    this._currentToken = localStorage.getItem('token');
    this.setupConnectionListeners();
    this.setupNetworkListeners();
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
    this.clearReconnectTimer();
  }

  private setupNetworkListeners(): void {
    if (typeof window !== 'undefined') {
      merge(
        fromEvent(window, 'online'),
        fromEvent(window, 'offline')
      )
        .pipe(takeUntil(this._destroy$))
        .subscribe(() => {
          const isOnline = navigator.onLine;
          this._online$.next(isOnline);

          if (isOnline && !this.isConnected() && !this._isManualDisconnect) {
            this.attemptReconnection();
          }
        });
    }
  }

  private setupConnectionListeners(): void {
    this.socket.on('connect', () => {
      this.clearReconnectTimer();
      this._currentDelay = this._reconnectConfig.initialDelay;

      this.updateState({
        connected: true,
        reconnecting: false,
        reconnectAttempt: 0,
        lastConnected: new Date(),
        error: null
      });
    });

    this.socket.on('disconnect', (reason: string) => {
      this.updateState({
        connected: false,
        lastDisconnected: new Date(),
        error: reason
      });

      // Auto-reconnect unless manually disconnected
      if (!this._isManualDisconnect && reason !== 'io client disconnect') {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error: any) => {
      const errorMessage = error?.message || 'Connection error';

      this.updateState({
        connected: false,
        error: errorMessage
      });

      if (!this._isManualDisconnect) {
        this.scheduleReconnect();
      }
    });

    this.socket.on('reconnect', (attemptNumber: number) => {
      this.clearReconnectTimer();
      this._currentDelay = this._reconnectConfig.initialDelay;

      this.updateState({
        connected: true,
        reconnecting: false,
        reconnectAttempt: 0,
        lastConnected: new Date(),
        error: null
      });
    });

    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      this.updateState({
        reconnecting: true,
        reconnectAttempt: attemptNumber
      });
    });

    this.socket.on('reconnect_error', (error: any) => {
      this.updateState({
        error: error?.message || 'Reconnection error'
      });
    });

    this.socket.on('reconnect_failed', () => {
      // Don't give up - schedule our own reconnection
      if (!this._isManualDisconnect) {
        this.scheduleReconnect();
      }
    });
  }

  private scheduleReconnect(): void {
    if (this._reconnectTimer || this._isManualDisconnect) {
      return;
    }

    const state = this._connectionState$.value;
    const { maxAttempts } = this._reconnectConfig;

    // Check max attempts (0 = infinite)
    if (maxAttempts > 0 && state.reconnectAttempt >= maxAttempts) {
      this.updateState({ reconnecting: false, error: 'Max reconnection attempts reached' });
      return;
    }

    // Check if online
    if (!navigator.onLine) {
      this.updateState({ reconnecting: false, error: 'No network connection' });
      // Will retry when online event fires
      return;
    }

    // Calculate delay with jitter
    const jitter = this._currentDelay * this._reconnectConfig.jitterFactor * (Math.random() - 0.5) * 2;
    const delay = Math.min(this._currentDelay + jitter, this._reconnectConfig.maxDelay);

    this.updateState({
      reconnecting: true,
      reconnectAttempt: state.reconnectAttempt + 1
    });

    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this.attemptReconnection();
    }, delay);

    // Increase delay for next attempt
    this._currentDelay = Math.min(
      this._currentDelay * this._reconnectConfig.multiplier,
      this._reconnectConfig.maxDelay
    );
  }

  private attemptReconnection(): void {
    if (this.isConnected() || this._isManualDisconnect) {
      return;
    }

    // Update token before reconnecting
    const storedToken = localStorage.getItem('token');
    if (storedToken && storedToken !== this._currentToken) {
      this._currentToken = storedToken;
    }

    if (this._currentToken) {
      this.socket.ioSocket.io.opts.query = { token: this._currentToken };
    }

    this.socket.connect();
  }

  private clearReconnectTimer(): void {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
  }

  private updateState(partial: Partial<ConnectionState>): void {
    const current = this._connectionState$.value;
    this._connectionState$.next({ ...current, ...partial });
  }

  // ===================
  // Public API
  // ===================

  get connectionState$() {
    return this._connectionState$.asObservable();
  }

  get connectionStatus() {
    return this._connectionState$.pipe(
      takeUntil(this._destroy$)
    );
  }

  get online$() {
    return this._online$.asObservable();
  }

  isConnected(): boolean {
    return this.socket.ioSocket?.connected ?? false;
  }

  isReconnecting(): boolean {
    return this._connectionState$.value.reconnecting;
  }

  connectToWebSocket(): void {
    if (this.socket.ioSocket?.connected) {
      return;
    }

    this._isManualDisconnect = false;
    this._currentDelay = this._reconnectConfig.initialDelay;

    if (this._currentToken) {
      this.socket.ioSocket.io.opts.query = { token: this._currentToken };
    }

    this.socket.connect();
  }

  disconnectWebSocket(): void {
    this._isManualDisconnect = true;
    this.clearReconnectTimer();

    if (this.socket.ioSocket?.connected) {
      this.socket.disconnect();
    }

    this.updateState({
      connected: false,
      reconnecting: false,
      reconnectAttempt: 0
    });
  }

  updateToken(newToken: string): void {
    if (!newToken || newToken === '' || newToken === undefined) {
      return;
    }

    this._currentToken = newToken;
    localStorage.setItem('token', newToken);

    if (this.socket.ioSocket?.connected) {
      this.socket.disconnect();
    }

    this.socket.ioSocket.io.opts.query = { token: newToken };
    this._isManualDisconnect = false;
    this.socket.connect();
  }

  forceReconnect(): void {
    this._isManualDisconnect = false;
    this._currentDelay = this._reconnectConfig.initialDelay;
    this.clearReconnectTimer();

    if (this.socket.ioSocket?.connected) {
      this.socket.disconnect();
    }

    this.updateState({
      reconnecting: true,
      reconnectAttempt: 0
    });

    setTimeout(() => this.attemptReconnection(), 100);
  }

  configureReconnection(config: Partial<ReconnectionConfig>): void {
    this._reconnectConfig = { ...this._reconnectConfig, ...config };
    this._currentDelay = this._reconnectConfig.initialDelay;
  }

  emitEvent(event: string, data: any): void {
    if (!this.socket.ioSocket?.connected) {
      return;
    }
    this.socket.emit(event, data);
  }

  emitEventWithAck<T>(event: string, data: any, timeout = 5000): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.socket.ioSocket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const timeoutId = setTimeout(() => {
        reject(new Error('Event acknowledgment timeout'));
      }, timeout);

      this.socket.emit(event, data, (response: T) => {
        clearTimeout(timeoutId);
        resolve(response);
      });
    });
  }

  listenEvent(event: string, callback: (data: any) => void): void {
    this.socket.on(event, callback);
  }

  removeEventListener(event: string, callback: (data: any) => void): void {
    this.socket.off(event, callback);
  }

  waitForConnection(timeout = 10000): Promise<void> {
    if (this.isConnected()) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, timeout);

      this._connectionState$
        .pipe(
          filter(state => state.connected),
          take(1),
          takeUntil(this._destroy$)
        )
        .subscribe(() => {
          clearTimeout(timeoutId);
          resolve();
        });
    });
  }

  getConnectionStats(): {
    state: ConnectionState;
    config: ReconnectionConfig;
    currentDelay: number;
    isOnline: boolean;
  } {
    return {
      state: this._connectionState$.value,
      config: { ...this._reconnectConfig },
      currentDelay: this._currentDelay,
      isOnline: this._online$.value
    };
  }

  socketError(): void {
    this.socket.on('connect_error', (error: any) => {
      // Connection error handled by setupConnectionListeners
    });
  }
}
