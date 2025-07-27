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

      setTimeout(() => {
        this.checkForUpdates().catch((error) => {
          this._logService.log(
            LevelLogEnum.WARN,
            'PwaUpdateService',
            'Initial update check failed',
            { error: error.message }
          );
        });
      }, 1000);

      this.startPeriodicChecks();
    }
  }

  private handleVersionReady(event: any): void {
    const updateInfo: UpdateInfo = {
      available: true,
      currentVersion: event.currentVersion?.hash || 'unknown',
      newVersion: event.latestVersion?.hash || 'unknown',
      timestamp: new Date()
    };

    // New version available - no need to log every version check

    this.updateAvailable$.next(updateInfo);
  }

  private startPeriodicChecks(): void {
    const checkIntervalMs = environment.PRODUCTION ? 30 * 60 * 1000 : 5 * 60 * 1000;
    this.checkInterval = interval(checkIntervalMs).subscribe(() => {
      this.checkForUpdates();
    });
  }

  private shouldAutoUpdate(): boolean {
    // Always return false - no automatic updates allowed
    return false;
  }

  /**
   * Verifica manualmente si hay actualizaciones disponibles
   */
  public checkForUpdates(): Promise<boolean> {
    if (this.isChecking) {
      return Promise.resolve(false);
    }

    if (!this.swUpdate.isEnabled) {
      return Promise.resolve(false);
    }

    this.isChecking = true;
    
    return this.swUpdate.checkForUpdate()
      .then(updateAvailable => {
        this.isChecking = false;
        
        return updateAvailable;
      })
      .catch(error => {
        this.isChecking = false;
        
        if (!error.message?.includes('Service workers are disabled')) {
          this._logService.log(
            LevelLogEnum.ERROR,
            'PwaUpdateService',
            'Error checking for updates',
            { error: error.message }
          );
        }
        
        return false;
      });
  }

  /**
   * Applies the available update
   */
  public applyUpdate(): Promise<void> {
    return this.swUpdate.activateUpdate()
      .then(() => {
        // Update applied successfully, clearing cache and reloading page - no need to log every update
        
        if (typeof window !== 'undefined' && (window as any).clearPWACache) {
          (window as any).clearPWACache().catch((error: any) => {
            this._logService.log(
              LevelLogEnum.WARN,
              'PwaUpdateService',
              'Cache clearing failed, continuing with reload',
              { error: error.message }
            );
          });
        }
        
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      })
      .catch(error => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'PwaUpdateService',
          'Error applying update',
          { error: error.message }
        );
        throw error;
      });
  }

  /**
   * Sets whether the application should update automatically
   */
  public setAutoUpdate(enabled: boolean): void {
    localStorage.setItem('pwa-auto-update', enabled.toString());
  }

  /**
   * Gets the automatic update status
   */
  public getAutoUpdateStatus(): boolean {
    return this.shouldAutoUpdate();
  }

  /**
   * Cleans up resources when the service is destroyed
   */
  public destroy(): void {
    if (this.checkInterval) {
      this.checkInterval.unsubscribe();
    }
    this.updateAvailable$.complete();
  }

  /**
   * Forces an immediate update check
   */
  public forceCheck(): Promise<boolean> {
    return this.checkForUpdates();
  }

  /**
   * Test method to simulate an available update
   * Only use in development
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
    } else {
      this._logService.log(
        LevelLogEnum.WARN,
        'PwaUpdateService',
        'Simulate update called in production - ignored'
      );
    }
  }

  /**
   * Forces an update check and simulates if necessary
   */
  public forceCheckAndSimulate(): Promise<boolean> {
    return this.checkForUpdates().then(updateAvailable => {
      if (!updateAvailable && !environment.PRODUCTION) {
        setTimeout(() => {
          this.simulateUpdate();
        }, 1000);
      }
      return updateAvailable;
    });
  }
}
