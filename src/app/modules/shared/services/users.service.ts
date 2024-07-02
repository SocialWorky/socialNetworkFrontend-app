import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { User } from '@shared/interfaces/user.interface';
import { environment } from '@env/environment';


@Injectable({
  providedIn: 'root'
})
export class UserService {

  private baseUrl: string;
  private token: string;

  constructor(private http: HttpClient) {
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

  searchUsers(limit?: number): Observable<any> {
    const url = `${this.baseUrl}/user?limit=${limit}`;
    const headers = this.getHeaders();
    return this.http.get(url, { headers });
  }

  getAllUsers(): Observable<any> {
    const url = `${this.baseUrl}/user`;
    const headers = this.getHeaders();
    return this.http.get(url, { headers });
  }

  getUserByName(name: string): Observable<any> {
    const url = `${this.baseUrl}/user/username/${name}`;
    const headers = this.getHeaders();
    return this.http.get(url, { headers });
  }

  getUserById(id: string): Observable<User> {
    const url = `${this.baseUrl}/user/${id}`;
    const headers = this.getHeaders();
    return this.http.get<User>(url, { headers });
  }

  userEdit(id: string, data: any): Observable<any> {
    const url = `${this.baseUrl}/user/edit/${id}`;
    const headers = this.getHeaders();
    return this.http.put(url, data, { headers });
  }

  getUserFriends(_id: string, _idRequest: string): Observable<boolean> {
    const url = `${this.baseUrl}/user/friends/${_id}/${_idRequest}`;
    const headers = this.getHeaders();
    return this.http.get<boolean>(url, { headers });
  }

  getFriendsPending(_id: string, _idRequest: string): Observable<{ status: boolean; _id: string }> {
    const url = `${this.baseUrl}/user/pending-friend/${_id}/${_idRequest}`;
    const headers = this.getHeaders();
    return this.http.get<{ status: boolean; _id: string }>(url, { headers });
  }

}
