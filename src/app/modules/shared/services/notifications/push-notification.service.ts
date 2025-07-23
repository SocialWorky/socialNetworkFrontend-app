import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { environment } from '@env/environment';
import firebase from 'firebase/compat/app';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {

  constructor(private _logService: LogService) {
    this.initFirebase();
  }

  private initFirebase() {

    if (!firebase.apps.length) {
      firebase.initializeApp({
        apiKey: environment.FIREBASE_API_KEY,
        authDomain: environment.FIREBASE_AUTH_DOMAIN,
        projectId: environment.FIREBASE_PROJECT_ID,
        storageBucket: environment.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: environment.FIREBASE_MESSAGING_SENDER_ID,
        appId: environment.FIREBASE_APP_ID,
      });
    } else {
      firebase.app();
    }
  }

  async initPush() {
    if (Capacitor.getPlatform() === 'web') {
      this.requestWebToken();
    } else {
      await PushNotifications.requestPermissions();
      await PushNotifications.register();
      this.listenToNativeEvents();
    }
  }

  private requestWebToken() {

    if (Capacitor.getPlatform() !== 'web') return;

    let messaging;

    if (Capacitor.getPlatform() === 'web') {
       messaging = firebase.messaging();
        } else {
      messaging = null;
    }

    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        messaging?.getToken({ vapidKey: environment.FIREBASE_VAPID_KEY })
          .then(token => {
            this._logService.log(
              LevelLogEnum.INFO,
              'PushNotificationService',
              'Web push token obtained successfully',
              { platform: 'web', tokenLength: token?.length }
            );
          });
      } else {
        this._logService.log(
          LevelLogEnum.WARN,
          'PushNotificationService',
          'Push notification permission denied',
          { platform: 'web', permission }
        );
      }
    });

    messaging?.onMessage(payload => {
      this._logService.log(
        LevelLogEnum.INFO,
        'PushNotificationService',
        'Foreground message received',
        { platform: 'web', messageId: payload.messageId }
      );
    });
  }

  private listenToNativeEvents() {
    PushNotifications.addListener('registration', token => {
      this._logService.log(
        LevelLogEnum.INFO,
        'PushNotificationService',
        'Native push token obtained',
        { platform: 'native', tokenLength: token.value?.length }
      );
    });

    PushNotifications.addListener('pushNotificationReceived', notification => {
      this._logService.log(
        LevelLogEnum.INFO,
        'PushNotificationService',
        'Native notification received',
        { platform: 'native', notificationId: notification.id }
      );
    });

    PushNotifications.addListener('pushNotificationActionPerformed', notification => {
      this._logService.log(
        LevelLogEnum.INFO,
        'PushNotificationService',
        'Native notification action performed',
        { platform: 'native', actionId: notification.actionId, notificationId: notification.notification.id }
      );
    });
  }
}
