import { Injectable } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { PwaUpdateService, UpdateInfo } from './pwa-update.service';
import { Subject, takeUntil } from 'rxjs';

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
      message: 'Nueva versión disponible. Toca para actualizar.',
      duration: 5000,
      position: 'top',
      color: 'primary',
      buttons: [
        {
          text: 'Actualizar',
          handler: () => {
            this.pwaUpdateService.applyUpdate();
          }
        },
        {
          text: 'Más tarde',
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
      header: 'Nueva versión disponible',
      message: `
        Se ha detectado una nueva versión de la aplicación.
        <br><br>
        <strong>Versión actual:</strong> ${updateInfo.currentVersion?.slice(0, 8)}...
        <br>
        <strong>Nueva versión:</strong> ${updateInfo.newVersion?.slice(0, 8)}...
        <br><br>
        ¿Deseas actualizar ahora?
      `,
      buttons: [
        {
          text: 'Más tarde',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Actualizar',
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
      message: 'Actualizando aplicación...',
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
      message: `Error al actualizar: ${error}`,
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
      message: 'Aplicación actualizada exitosamente',
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
