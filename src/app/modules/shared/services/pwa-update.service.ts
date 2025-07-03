import { Injectable } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { BehaviorSubject, interval, Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface UpdateInfo {
  available: boolean;
  currentVersion?: string;
  newVersion?: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root',
})
export class PwaUpdateService {
  private updateAvailable$ = new BehaviorSubject<UpdateInfo>({
    available: false,
    timestamp: new Date()
  });

  private isChecking = false;
  private checkInterval: any;

  constructor(private swUpdate: SwUpdate) {
    this.initializeUpdateDetection();
  }

  /**
   * Observable que emite cuando hay una actualización disponible
   */
  get updateAvailable(): Observable<UpdateInfo> {
    return this.updateAvailable$.asObservable();
  }

  /**
   * Inicializa la detección de actualizaciones
   */
  private initializeUpdateDetection(): void {
    if (!this.swUpdate.isEnabled) {
      console.log('Service Worker no está habilitado');
      return;
    }

    // Escuchar eventos de actualización
    this.swUpdate.versionUpdates.subscribe(event => {
      console.log('Evento de actualización:', event);
      
      switch (event.type) {
        case 'VERSION_READY':
          this.handleVersionReady(event);
          break;
        case 'VERSION_INSTALLATION_FAILED':
          console.error('Error al instalar la nueva versión:', event);
          break;
        case 'NO_NEW_VERSION_DETECTED':
          console.log('No hay nuevas versiones disponibles');
          break;
      }
    });

    // Verificar actualizaciones periódicamente
    this.startPeriodicChecks();
  }

  /**
   * Maneja cuando una nueva versión está lista
   */
  private handleVersionReady(event: any): void {
    const updateInfo: UpdateInfo = {
      available: true,
      currentVersion: event.currentVersion?.hash,
      newVersion: event.latestVersion?.hash,
      timestamp: new Date()
    };

    this.updateAvailable$.next(updateInfo);
    
    // Si está en modo automático, actualizar inmediatamente
    if (this.shouldAutoUpdate()) {
      this.applyUpdate();
    }
  }

  /**
   * Inicia verificaciones periódicas de actualizaciones
   */
  private startPeriodicChecks(): void {
    // Verificar cada 30 minutos en producción
    const checkIntervalMs = environment.PRODUCTION ? 30 * 60 * 1000 : 5 * 60 * 1000;
    
    this.checkInterval = interval(checkIntervalMs).subscribe(() => {
      this.checkForUpdates();
    });

    // Verificación inicial después de 1 minuto
    setTimeout(() => {
      this.checkForUpdates();
    }, 60000);
  }

  /**
   * Verifica si debe actualizar automáticamente
   */
  private shouldAutoUpdate(): boolean {
    const autoUpdate = localStorage.getItem('pwa-auto-update');
    return autoUpdate === 'true';
  }

  /**
   * Verifica manualmente si hay actualizaciones disponibles
   */
  public checkForUpdates(): Promise<boolean> {
    if (this.isChecking) {
      return Promise.resolve(false);
    }

    this.isChecking = true;

    return this.swUpdate.checkForUpdate()
      .then(updateAvailable => {
        console.log('Verificación manual de actualización:', updateAvailable);
        this.isChecking = false;
        return updateAvailable;
      })
      .catch(error => {
        console.error('Error al verificar actualizaciones:', error);
        this.isChecking = false;
        return false;
      });
  }

  /**
   * Aplica la actualización disponible
   */
  public applyUpdate(): Promise<void> {
    return this.swUpdate.activateUpdate()
      .then(() => {
        console.log('Actualización aplicada exitosamente');
        // Recargar la página después de un breve delay
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      })
      .catch(error => {
        console.error('Error al aplicar la actualización:', error);
        throw error;
      });
  }

  /**
   * Configura si la aplicación debe actualizarse automáticamente
   */
  public setAutoUpdate(enabled: boolean): void {
    localStorage.setItem('pwa-auto-update', enabled.toString());
  }

  /**
   * Obtiene el estado de actualización automática
   */
  public getAutoUpdateStatus(): boolean {
    return this.shouldAutoUpdate();
  }

  /**
   * Limpia los recursos cuando el servicio se destruye
   */
  public destroy(): void {
    if (this.checkInterval) {
      this.checkInterval.unsubscribe();
    }
    this.updateAvailable$.complete();
  }

  /**
   * Fuerza una verificación inmediata de actualizaciones
   */
  public forceCheck(): Promise<boolean> {
    return this.checkForUpdates();
  }
}
