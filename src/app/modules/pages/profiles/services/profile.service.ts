import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { environment } from '@env/environment';
import { ProfileData } from '../interface/profile.interface';
import { ProfileNotificationService } from '@shared/services/notifications/profile-notification.service';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {

  private baseUrl: string;
  private token: string;

  constructor(
    private http: HttpClient,
    private _profileNotificationService: ProfileNotificationService
  ) {
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

  updateProfile(idUser: string, profileData: ProfileData): Observable<ProfileData> {
    const url = `${this.baseUrl}/user/profile/${idUser}`;
    const headers = this.getHeaders();
    return this.http.put<ProfileData>(url, profileData, { headers }).pipe(
      tap(() => {
        this._profileNotificationService.notifyProfileUpdated();
      })
    );
  }

  validateProfile(idUser: string): Observable<ProfileData> {
    const url = `${this.baseUrl}/user/validate-profile/${idUser}`;
    const headers = this.getHeaders();
    return this.http.get<ProfileData>(url, { headers });
  }

}