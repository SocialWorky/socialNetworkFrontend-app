import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { environment } from 'src/environments/environment';
import { NotificationCenter } from '@shared/interfaces/notificationsCenter.interface';
import { NotificationsData } from '@shared/modules/notifications-panel/interfaces/notificationsData.interface';
import { Observable } from 'rxjs';



@Injectable({
  providedIn: 'root'
})
export class NotificationCenterService {

  private baseUrl: string;
  private token: string;

  constructor(private http: HttpClient) {
    this.baseUrl = environment.APINOTIFICATIONCENTER;
    this.token = localStorage.getItem('token') || '';
  }

  private getHeaders(): HttpHeaders {
    const token = this.token;
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return headers;
  }

  createNotification(notification: NotificationCenter) {
    const url = `${this.baseUrl}/notifications`;
    const headers = this.getHeaders();
    return this.http.post(url, notification, { headers });
  }

  getNotifications(userId: string): Observable<NotificationsData> {
    const url = `${this.baseUrl}/notifications/${userId}`;
    const headers = this.getHeaders();
    return this.http.get<NotificationsData>(url, { headers });
  }

  updateNotification(notificationId: string) {
    const url = `${this.baseUrl}/notifications/${notificationId}`;
    const headers = this.getHeaders();
    return this.http.put(url, {}, { headers });
  }

}
