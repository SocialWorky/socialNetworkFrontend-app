import { Injectable } from '@angular/core';
import { Token } from '@shared/interfaces/token.interface';
import { Socket } from 'ngx-socket-io';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  userToken: string;

  constructor(private socket: Socket) {
    this.userToken = localStorage.getItem('token')!;
  }

  connectToWebSocket(token: Token) {
    const queryObject = {
      status: 'online',
      lastActivity: new Date(),
    };

    this.socket.ioSocket.io.opts.query = queryObject;
    this.socket.ioSocket.auth = { token: this.userToken };
    this.socket.ioSocket.io.opts.extraHeaders = {
      Authorization: `Bearer ${this.userToken}`,
    };

    this.socket.connect();
  }

  disconnectWebSocket() {
    this.socket.disconnect();
  }
}
