import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '@env/environment';
import { AuthService } from '@auth/services/auth.service';
import { FriendsStatus } from '@shared/interfaces/friend.interface';

@Injectable({
  providedIn: 'root'
})
export class FriendsService {

  private baseUrl: string;

  constructor(private http: HttpClient, private _authService: AuthService) {
    this.baseUrl = environment.API_URL;
  }

  getIsMyFriend(_id: string, friendId: string): Observable<FriendsStatus> {
    const url = `${this.baseUrl}/friends/isfriend/${_id}/${friendId}`;
    return this.http.get<FriendsStatus>(url);
  }

  requestFriend(friendId: string): Observable<any> {
    const _id = this._authService.getDecodedToken()?.id;
    const body = {
      senderId: _id,
      receiverId: friendId
    };
    const url = `${this.baseUrl}/friends/request`;
    return this.http.post(url, body);
  }

  deleteFriend(id: string): Observable<any> {
    const url = `${this.baseUrl}/friends/${id}`;
    return this.http.delete(url);
  }

  acceptFriendship(id: string): Observable<any> {
    const url = `${this.baseUrl}/friends/accept/${id}`;
    return this.http.put(url, {});
  }
}
