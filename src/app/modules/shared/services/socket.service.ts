import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  constructor(private socket: Socket) {}

  connectToWebSocket() {
    if (this.socket.ioSocket.connected) {
      return;
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

  updateToken(newToken: string) {
    if(!newToken || newToken === '' || newToken === undefined) return

    if (this.socket.ioSocket.connected) {
      this.socket.disconnect();
    }

    this.socket.ioSocket.io.opts.extraHeaders = { Authorization: `Bearer ${newToken}` };
    this.socket.ioSocket.io.opts.query = { token: newToken };

    this.socket.connect();
  }

  emitEvent(event: string, data: any) {
    this.socket.emit(event, data);
  }

  listenEvent(event: string, callback: (data: any) => void) {
    this.socket.on(event, callback);
  }

  socketError() {
    this.socket.on('connect_error', (error: any) => {
      console.log('Error de conexión:', error);
    });
  }
}
