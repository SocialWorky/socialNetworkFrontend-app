import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private _connectionStatus$ = new BehaviorSubject<boolean>(false);

  private _currentToken: string | null = null;

  constructor(private socket: Socket) {
    this.setupConnectionListeners();
    this._currentToken = localStorage.getItem('token');
  }

  private setupConnectionListeners() {
    // Listen to connection events
    this.socket.on('connect', () => {
      this._connectionStatus$.next(true);
    });

    this.socket.on('disconnect', (reason: string) => {
      this._connectionStatus$.next(false);
    });

    this.socket.on('connect_error', (error: any) => {
      this._connectionStatus$.next(false);
    });

    this.socket.on('reconnect', (attemptNumber: number) => {
      this._connectionStatus$.next(true);
    });

    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
    });

    this.socket.on('reconnect_error', (error: any) => {
    });

    this.socket.on('reconnect_failed', () => {
    });
  }

  get connectionStatus() {
    return this._connectionStatus$.asObservable();
  }

  isConnected(): boolean {
    return this.socket.ioSocket.connected;
  }

  connectToWebSocket() {
    if (this.socket.ioSocket.connected) {
      return;
    }

    // If there is a token, set it up before connecting
    if (this._currentToken) {
      this.configureSocketWithToken(this._currentToken);
    }

    this.socket.connect();
  }

  disconnectWebSocket() {
    if (this.socket.ioSocket.connected) {
      this.socket.disconnect();
    } else {
      return;
    }
  }

  private configureSocketWithToken(token: string) {
    this.socket.ioSocket.io.opts.extraHeaders = { Authorization: `Bearer ${token}` };
    this.socket.ioSocket.io.opts.query = { token: token };
  }

  updateToken(newToken: string) {
    if(!newToken || newToken === '' || newToken === undefined) {
      return;
    }

    this._currentToken = newToken;

    if (this.socket.ioSocket.connected) {
      this.socket.disconnect();
    }

    this.configureSocketWithToken(newToken);
    this.socket.connect();
  }

  emitEvent(event: string, data: any) {
    if (!this.socket.ioSocket.connected) {
      return;
    }
    this.socket.emit(event, data);
  }

  listenEvent(event: string, callback: (data: any) => void) {
    this.socket.on(event, callback);
  }

  removeEventListener(event: string, callback: (data: any) => void) {
    this.socket.off(event, callback);
  }

  socketError() {
    this.socket.on('connect_error', (error: any) => {
      // Connection error handled
    });
  }
}

