import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { environment } from '@env/environment';
import firebase from 'firebase/compat/app';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {

  constructor() {
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
            console.log('Token web:', token);
            // Aquí puedes enviar el token al backend
          });
      } else {
        console.log('Permiso denegado');
      }
    });

    messaging?.onMessage(payload => {
      console.log('Mensaje recibido en primer plano:', payload);
    });
  }

  private listenToNativeEvents() {
    PushNotifications.addListener('registration', token => {
      console.log('Token Nativo:', token.value);
      // Envía este token a tu backend
    });

    PushNotifications.addListener('pushNotificationReceived', notification => {
      console.log('Notificación recibida:', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', notification => {
      console.log('Acción realizada:', notification.actionId, notification.notification);
    });
  }
}
