import { Injectable } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { environment } from '@env/environment';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';

export interface UpdateInfo {
  available: boolean;
  currentVersion?: string;
  newVersion?: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class PwaUpdateService {
  private updateAvailable$ = new BehaviorSubject<UpdateInfo>({
    available: false,
    timestamp: new Date()
  });

  private isChecking = false;
  private checkInterval: any;

  constructor(
    private swUpdate: SwUpdate,
    private _logService: LogService
  ) {
    this.initializeUpdateDetection();
  }

  get updateAvailable(): Observable<UpdateInfo> {
    return this.updateAvailable$.asObservable();
  }

  private initializeUpdateDetection(): void {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates.subscribe(event => {
        if (event.type === 'VERSION_READY') {
          this.handleVersionReady(event);
        }
      });

      // Start periodic checks if auto-update is enabled
      if (this.shouldAutoUpdate()) {
        this.startPeriodicChecks();
      }
    } else {
      // Log removed to avoid spam - service workers status is checked frequently
    }
  }

  private handleVersionReady(event: any): void {
    const updateInfo: UpdateInfo = {
      available: true,
      currentVersion: event.currentVersion?.hash,
      newVersion: event.latestVersion?.hash,
      timestamp: new Date()
    };

    this._logService.log(
      LevelLogEnum.INFO,
      'PwaUpdateService',
      'New version available',
      { 
        currentVersion: updateInfo.currentVersion,
        newVersion: updateInfo.newVersion 
      }
    );

    this.updateAvailable$.next(updateInfo);

    // Auto-update if enabled
    if (this.shouldAutoUpdate()) {
      this.applyUpdate();
    }
  }

  private startPeriodicChecks(): void {
    // Check for updates every 30 minutes
    this.checkInterval = interval(30 * 60 * 1000).subscribe(() => {
      this.checkForUpdates();
    });
  }

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

    // Check if service workers are enabled
    if (!this.swUpdate.isEnabled) {
      // Log removed to avoid spam - service workers status is checked frequently
      return Promise.resolve(false);
    }

    this.isChecking = true;

    return this.swUpdate.checkForUpdate()
      .then(updateAvailable => {
        this.isChecking = false;
        return updateAvailable;
      })
      .catch(error => {
        // Solo mostrar error si no es por service workers deshabilitados
        if (!error.message?.includes('Service workers are disabled')) {
          console.error('Error al verificar actualizaciones:', error);
        }
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
        this._logService.log(
          LevelLogEnum.INFO,
          'PwaUpdateService',
          'Update applied successfully, reloading page'
        );
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
    this._logService.log(
      LevelLogEnum.INFO,
      'PwaUpdateService',
      'Auto-update setting changed',
      { enabled }
    );
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

  /**
   * Método de prueba para simular una actualización disponible
   * Solo usar en desarrollo
   */
  public simulateUpdate(): void {
    if (!environment.PRODUCTION) {
      const mockUpdateInfo: UpdateInfo = {
        available: true,
        currentVersion: 'abc12345',
        newVersion: 'def67890',
        timestamp: new Date()
      };
      
      this.updateAvailable$.next(mockUpdateInfo);
    }
  }
}
