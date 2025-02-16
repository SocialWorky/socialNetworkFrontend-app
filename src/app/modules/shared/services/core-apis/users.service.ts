import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { User } from '@shared/interfaces/user.interface';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private baseUrl = environment.API_URL;

  constructor(private http: HttpClient) {}

  private handleError(error: any) {
    console.error('An error occurred', error);
    return throwError(() => new Error('Something went wrong; please try again later.'));
  }

  searchUsers(limit?: number): Observable<User[]> {
    const url = `${this.baseUrl}/user?limit=${limit}`;
    return this.http.get<User[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getAllUsers(): Observable<User[]> {
    const url = `${this.baseUrl}/user`;
    return this.http.get<User[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getUserByName(name: string): Observable<User> {
    const url = `${this.baseUrl}/user/username/${name}`;
    return this.http.get<User>(url).pipe(
      catchError(this.handleError)
    );
  }

  getUserById(id: string): Observable<User> {
    const url = `${this.baseUrl}/user/${id}`;
    return this.http.get<User>(url).pipe(
      catchError(this.handleError)
    );
  }

  userEdit(id: string, data: any): Observable<User> {
    const url = `${this.baseUrl}/user/edit/${id}`;
    return this.http.put<User>(url, data).pipe(
      catchError(this.handleError)
    );
  }

  getUserFriends(_id: string, _idRequest: string): Observable<boolean> {
    const url = `${this.baseUrl}/user/friends/${_id}/${_idRequest}`;
    return this.http.get<boolean>(url).pipe(
      catchError(this.handleError)
    );
  }

  getFriendsPending(_id: string, _idRequest: string): Observable<{ status: boolean; _id: string }> {
    const url = `${this.baseUrl}/user/pending-friend/${_id}/${_idRequest}`;
    return this.http.get<{ status: boolean; _id: string }>(url).pipe(
      catchError(this.handleError)
    );
  }
}
