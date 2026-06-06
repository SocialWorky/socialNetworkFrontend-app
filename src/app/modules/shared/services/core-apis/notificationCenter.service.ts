import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { environment } from 'src/environments/environment';
import { NotificationCenter } from '@shared/interfaces/notificationsCenter.interface';
import { NotificationsData } from '@shared/modules/notifications-panel/interfaces/notificationsData.interface';
import { Observable, forkJoin } from 'rxjs';

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

  getNotifications(userId: string, bypassCache = false): Observable<NotificationsData> {
    const url = `${this.baseUrl}/notifications/${userId}`;
    if (bypassCache) {
      // Append ?_t=timestamp so each fresh-fetch has a unique URL.
      // CacheInterceptor uses urlWithParams as key → cache miss (no stale data).
      // DeduplicationInterceptor fingerprints by urlWithParams → no merging with
      // concurrent panel requests. No custom headers → no CORS preflight issues.
      return this.http.get<NotificationsData>(`${url}?_t=${Date.now()}`);
    }
    return this.http.get<NotificationsData>(url);
  }

  updateNotification(notificationId: string) {
    const url = `${this.baseUrl}/notifications/${notificationId}`;
    return this.http.put(url, {});
  }

  deleteNotification(notificationId: string) {
    const url = `${this.baseUrl}/notifications/${notificationId}`;
    return this.http.delete(url);
  }

  markAllAsRead(userId: string) {
    const url = `${this.baseUrl}/notifications/mark-all-as-read/${userId}`;
    return this.http.put(url, {});
  }

  markMultipleAsRead(ids: string[]): Observable<any[]> {
    return forkJoin(ids.map(id => this.updateNotification(id)));
  }

  deleteMultipleNotifications(ids: string[]): Observable<any[]> {
    return forkJoin(ids.map(id => this.deleteNotification(id)));
  }

}
