import { Component, OnInit } from '@angular/core';

import { AuthService } from '@auth/services/auth.service';
import { NotificationCenterService } from '@shared/services/notificationCenter.service';

@Component({
  selector: 'worky-notifications-panel',
  templateUrl: './notifications-panel.component.html',
  styleUrls: ['./notifications-panel.component.scss'],
})
export class NotificationsPanelComponent  implements OnInit {
  isActive = false;

  listNotifications = [];

  get userToken() {
    return this._authService.getDecodedToken();
  }

  constructor(
    private _authService: AuthService,
    private _notificationCenterService: NotificationCenterService
  ) {}

  ngOnInit() {
    this.getNotifications();
  }
  togglePanel() {
    this.isActive = !this.isActive;
    this.getNotifications();
  }

  getNotifications() {
    const userId = this.userToken._id!;
    this._notificationCenterService.getNotifications(userId).subscribe({
      next: (response: any) => {
        console.log('Notificaciones:', response);
        // this.listNotifications = response.notifications;
      },
      error: (error) => {
        console.error('Error al obtener las notificaciones:', error);
      },
    });
  }
}
