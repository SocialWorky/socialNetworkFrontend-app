import { Injectable } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { PwaUpdateService, UpdateInfo } from './pwa-update.service';
import { Subject, takeUntil } from 'rxjs';
import { translations } from '@translations/translations';

@Injectable({
  providedIn: 'root'
})
export class PwaNotificationService {
  private destroy$ = new Subject<void>();

  constructor(
    private alertController: AlertController,
    private toastController: ToastController,
    private pwaUpdateService: PwaUpdateService
  ) {
    this.initializeNotifications();
  }

  /**
   * Inicializa las notificaciones de actualización
   */
  private initializeNotifications(): void {
    this.pwaUpdateService.updateAvailable
      .pipe(takeUntil(this.destroy$))
      .subscribe(updateInfo => {
        if (updateInfo.available) {
          this.showUpdateNotification(updateInfo);
        }
      });
  }

  /**
   * Muestra una notificación toast de actualización
   */
  private async showUpdateNotification(updateInfo: UpdateInfo): Promise<void> {
    const toast = await this.toastController.create({
      message: translations['pwa.notification.toast.message'],
      duration: 5000,
      position: 'top',
      color: 'primary',
      buttons: [
        {
          text: translations['pwa.notification.toast.update'],
          handler: () => {
            this.pwaUpdateService.applyUpdate();
          }
        },
        {
          text: translations['pwa.notification.toast.later'],
          role: 'cancel'
        }
      ]
    });

    await toast.present();
  }

  /**
   * Muestra un alert de confirmación de actualización
   */
  async showUpdateAlert(updateInfo: UpdateInfo): Promise<void> {
    const alert = await this.alertController.create({
      header: translations['pwa.notification.alert.title'],
      message: `
        ${translations['pwa.notification.alert.message']}
        <br><br>
        <strong>${translations['pwa.notification.alert.currentVersion']}</strong> ${updateInfo.currentVersion?.slice(0, 8)}...
        <br>
        <strong>${translations['pwa.notification.alert.newVersion']}</strong> ${updateInfo.newVersion?.slice(0, 8)}...
        <br><br>
        ${translations['pwa.notification.alert.confirm']}
      `,
      buttons: [
        {
          text: translations['pwa.notification.toast.later'],
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: translations['pwa.notification.toast.update'],
          handler: () => {
            this.pwaUpdateService.applyUpdate();
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Muestra una notificación de progreso de actualización
   */
  async showUpdateProgress(): Promise<void> {
    const toast = await this.toastController.create({
      message: translations['pwa.notification.progress.message'],
      duration: 0,
      position: 'top',
      color: 'success',
      icon: 'refresh-outline'
    });

    await toast.present();
  }

  /**
   * Muestra una notificación de error de actualización
   */
  async showUpdateError(error: string): Promise<void> {
    const toast = await this.toastController.create({
      message: `${translations['pwa.notification.error.message']} ${error}`,
      duration: 4000,
      position: 'top',
      color: 'danger',
      icon: 'alert-circle-outline'
    });

    await toast.present();
  }

  /**
   * Muestra una notificación de actualización exitosa
   */
  async showUpdateSuccess(): Promise<void> {
    const toast = await this.toastController.create({
      message: translations['pwa.notification.success.message'],
      duration: 3000,
      position: 'top',
      color: 'success',
      icon: 'checkmark-circle-outline'
    });

    await toast.present();
  }

  /**
   * Limpia los recursos
   */
  destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
