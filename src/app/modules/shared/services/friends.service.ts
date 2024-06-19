import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '@env/environment';
import { AuthService } from '@auth/services/auth.service';
import { FriendsStatus } from '@shared/interfaces/friend.interface';

@Injectable({
  providedIn: 'root'
})
export class FriendsService {

  private baseUrl: string;
  private token: string;

  constructor(private http: HttpClient, private _authService: AuthService) {
    this.baseUrl = environment.API_URL;
    this.token = localStorage.getItem('token') || '';
  }

  private getHeaders(): HttpHeaders {
    const token = this.token;
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return headers;
  }

  getIsMyFriend(_id: string, friendId: string): Observable<FriendsStatus> {
    const url = `${this.baseUrl}/friends/isfriend/${_id}/${friendId}`;
    const headers = this.getHeaders();
    return this.http.get<FriendsStatus>(url, { headers });
  }

  requestFriend(friendId: string): Observable<any> {
    const _id = this._authService.getDecodedToken().id;
    const body = {
      senderId: _id,
      receiverId: friendId
    };
    const url = `${this.baseUrl}/friends/request`;
    const headers = this.getHeaders();
    return this.http.post(url, body, { headers });
  }

  deleteFriend(id: string): Observable<any> {
    const url = `${this.baseUrl}/friends/${id}`;
    const headers = this.getHeaders();
    return this.http.delete(url, { headers });
  }

  acceptFriendship(id: string): Observable<any> {
    const url = `${this.baseUrl}/friends/accept/${id}`;
    const headers = this.getHeaders();
    return this.http.put(url, {}, { headers });
  }
}
