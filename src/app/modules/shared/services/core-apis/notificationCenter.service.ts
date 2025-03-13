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

  constructor(private http: HttpClient) {
    this.baseUrl = environment.APINOTIFICATIONCENTER;
  }

  createNotification(notification: NotificationCenter) {
    const url = `${this.baseUrl}/notifications`;
    return this.http.post(url, notification);
  }

  getNotifications(userId: string): Observable<NotificationsData> {
    const url = `${this.baseUrl}/notifications/${userId}`;
    return this.http.get<NotificationsData>(url);
  }

  updateNotification(notificationId: string) {
    const url = `${this.baseUrl}/notifications/${notificationId}`;
    return this.http.put(url, {});
  }

}
