import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '@env/environment';
import { FriendsStatus } from '@shared/interfaces/friend.interface';

@Injectable({
  providedIn: 'root'
})
export class FriendsService {

  private baseUrl: string | undefined;

  constructor(private http: HttpClient) {
    this.baseUrl = environment.API_URL;
  }

  getIsMyFriend(_id: string, friendId: string, bypassCache = false): Observable<FriendsStatus> {
    const url = `${this.baseUrl}/friends/isfriend/${_id}/${friendId}`;
    if (bypassCache) {
      // Unique URL per call → CacheInterceptor miss + DeduplicationInterceptor no-merge.
      // Needed for real-time refresh: a user who didn't mutate has a stale 5min friends cache.
      return this.http.get<FriendsStatus>(`${url}?_t=${Date.now()}`);
    }
    return this.http.get<FriendsStatus>(url);
  }

  requestFriend(friendId: string): Observable<any> {
    const body = {
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
