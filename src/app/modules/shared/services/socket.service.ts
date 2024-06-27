import { Injectable } from '@angular/core';
import { Token } from '@shared/interfaces/token.interface';
import { Socket } from 'ngx-socket-io';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  constructor(private socket: Socket) { }

  connectToWebSocket(token: Token) {
    const queryObject = {
      id: token.id,
      name: token.name,
      role: token.role,
      avatar: token.avatar,
      email: token.email,
      username: token.username,
    };

    this.socket.ioSocket.io.opts.query = queryObject;

    this.socket.connect();
  }

  disconnectWebSocket() {
    this.socket.disconnect();
  }
}
