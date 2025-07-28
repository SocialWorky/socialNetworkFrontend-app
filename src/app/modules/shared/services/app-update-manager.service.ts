import { Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, interval, Subscription } from 'rxjs';
import { takeUntil, switchMap, filter } from 'rxjs/operators';
import { AppVersionService, VersionCheckResult } from './app-version.service';
import { LogService, LevelLogEnum } from './core-apis/log.service';
import { AlertService } from './alert.service';
import { Alerts } from '../enums/alerts.enum';
import { translationsDictionary } from '../../../../translations/translations';

@Injectable({
  providedIn: 'root'
})
export class AppUpdateManagerService implements OnDestroy {
  private readonly UPDATE_CHECK_INTERVAL = 1000 * 60 * 60 * 2; // 2 hours
  private readonly FORCE_UPDATE_CHECK_INTERVAL = 1000 * 60 * 60; // 1 hour
  
  private unsubscribe$ = new Subject<void>();
  private updateCheckSubscription: Subscription | null = null;
  private lastUpdateCheck = 0;

  constructor(
    private appVersionService: AppVersionService,
    private router: Router,
    private logService: LogService,
    private alertService: AlertService
  ) {
    this.logService.log(LevelLogEnum.INFO, 'AppUpdateManager', 'Service initialized - starting update checks');
    this.initializeUpdateChecks();
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
    if (this.updateCheckSubscription) {
      this.updateCheckSubscription.unsubscribe();
    }
  }

  /**
   * Get translation for a key
   */
  private getTranslation(key: string): string {
    return translationsDictionary[key] || key;
  }

  /**
   * Initialize automatic update checks
   */
  private initializeUpdateChecks(): void {
    // Check for updates on app start
    this.checkForUpdatesOnStart();
    
    // Set up periodic update checks
    this.setupPeriodicUpdateChecks();
    
    // Listen for version check results
    this.appVersionService.getVersionCheckResult()
      .pipe(
        takeUntil(this.unsubscribe$),
        filter(result => result !== null)
      )
      .subscribe(result => {
        this.handleVersionCheckResult(result!);
      });
  }

  /**
   * Check for updates when app starts
   */
  private checkForUpdatesOnStart(): void {
    const now = Date.now();
    const timeSinceLastCheck = now - this.lastUpdateCheck;
    
    // Only check if enough time has passed
    if (timeSinceLastCheck > this.FORCE_UPDATE_CHECK_INTERVAL) {
      this.logService.log(LevelLogEnum.INFO, 'AppUpdateManager', 'Starting version check on app start');
      
      this.appVersionService.checkForUpdates()
        .pipe(takeUntil(this.unsubscribe$))
        .subscribe({
          next: (result) => {
            this.lastUpdateCheck = now;
            this.handleVersionCheckResult(result);
          },
          error: (error) => {
            console.error('❌ Error checking for updates:', error);
            this.logService.log(LevelLogEnum.ERROR, 'AppUpdateManager', 'Error checking for updates on start', error);
          }
        });
    } else {
      console.log('⏭️ Skipping version check - too soon since last check');
    }
  }

  /**
   * Set up periodic update checks
   */
  private setupPeriodicUpdateChecks(): void {
    this.updateCheckSubscription = interval(this.UPDATE_CHECK_INTERVAL)
      .pipe(
        takeUntil(this.unsubscribe$),
        switchMap(() => this.appVersionService.checkForUpdates())
      )
      .subscribe({
        next: (result) => {
          this.lastUpdateCheck = Date.now();
          this.handleVersionCheckResult(result);
        },
        error: (error) => {
          this.logService.log(LevelLogEnum.ERROR, 'AppUpdateManager', 'Error in periodic update check', error);
        }
      });
  }

  /**
   * Handle version check result
   */
  private handleVersionCheckResult(result: VersionCheckResult): void {
    // Check for maintenance mode first
    if (result.isMaintenanceMode) {
      this.handleMaintenanceMode(result);
      return;
    }

    // Check for force update
    if (result.forceUpdate) {
      this.handleForceUpdate(result);
      return;
    }

    // Check for optional update
    if (result.needsUpdate) {
      this.handleOptionalUpdate(result);
    }
  }

  /**
   * Handle maintenance mode
   */
  private handleMaintenanceMode(result: VersionCheckResult): void {
    this.logService.log(LevelLogEnum.WARN, 'AppUpdateManager', 'App is in maintenance mode');
    
    // Show maintenance alert
    this.alertService.showAlert(
      this.getTranslation('APP.UPDATE.MAINTENANCE.TITLE'),
      result.serverVersion.maintenanceMessage || this.getTranslation('APP.UPDATE.MAINTENANCE.MESSAGE'),
      Alerts.WARNING
    );
    
    // Optionally redirect to maintenance page
    if (this.router.url !== '/maintenance') {
      this.router.navigate(['/maintenance']);
    }
  }

  /**
   * Handle force update
   */
  private handleForceUpdate(result: VersionCheckResult): void {
    this.logService.log(LevelLogEnum.INFO, 'AppUpdateManager', 'Force update required');
    
    // Show alert with single update button (no cancel option for force updates)
    this.showForceUpdateAlert(result);
  }

  /**
   * Show force update alert with custom callback
   */
  private showForceUpdateAlert(result: VersionCheckResult): void {
    const swalOptions = {
      title: this.getTranslation('APP.UPDATE.TITLE'),
      text: this.getTranslation('APP.UPDATE.FORCE.MESSAGE'),
      icon: 'warning' as any,
      showConfirmButton: true,
      confirmButtonText: this.getTranslation('APP.UPDATE.UPDATE_NOW'),
      allowOutsideClick: false,
      allowEscapeKey: false,
      customClass: {
        container: 'custom-swal-container custom-swal-center',
      },
    };

    // Import Swal dynamically to use it directly
    import('sweetalert2').then(({ default: Swal }) => {
      Swal.fire(swalOptions).then((swalResult) => {
        if (swalResult.isConfirmed) {
          this.performAppUpdate(result);
        }
      });
    });
  }

  /**
   * Handle optional update
   */
  private handleOptionalUpdate(result: VersionCheckResult): void {
    this.logService.log(LevelLogEnum.INFO, 'AppUpdateManager', 'Optional update available');
    
    // Show confirmation dialog with update option
    this.alertService.showConfirmation(
      this.getTranslation('APP.UPDATE.AVAILABLE.TITLE'),
      this.getTranslation('APP.UPDATE.AVAILABLE.MESSAGE'),
      this.getTranslation('APP.UPDATE.UPDATE_NOW'),
      this.getTranslation('APP.UPDATE.LATER')
    ).subscribe(confirmed => {
      if (confirmed) {
        this.performAppUpdate(result);
      }
    });
  }

  /**
   * Perform app update - clear cache and reload
   */
  private async performAppUpdate(result: VersionCheckResult): Promise<void> {
    try {
      this.logService.log(LevelLogEnum.INFO, 'AppUpdateManager', 'Starting app update process');

      if (result.serverVersion.downloadUrl) {
        // For downloadable apps
        window.open(result.serverVersion.downloadUrl, '_blank');
      } else {
        // For PWA - clear cache and reload
        await this.clearCacheAndReload();
      }
    } catch (error) {
      this.logService.log(LevelLogEnum.ERROR, 'AppUpdateManager', 'Error during app update', { error: error instanceof Error ? error.message : String(error) });
      // Fallback: force reload anyway
      window.location.reload();
    }
  }

  /**
   * Clear cache and reload application
   */
  private async clearCacheAndReload(): Promise<void> {
    try {
      this.logService.log(LevelLogEnum.INFO, 'AppUpdateManager', 'Clearing application cache');

      // Clear browser cache
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }

      // Clear localStorage and sessionStorage
      localStorage.clear();
      sessionStorage.clear();

      // Force reload from server (bypass cache)
      window.location.reload();

    } catch (error) {
      this.logService.log(LevelLogEnum.ERROR, 'AppUpdateManager', 'Error clearing cache', { error: error instanceof Error ? error.message : String(error) });
      // Fallback: force reload anyway
      window.location.reload();
    }
  }

  /**
   * Force check for updates (called from user interface)
   */
  forceCheckForUpdates(): void {
    this.logService.log(LevelLogEnum.INFO, 'AppUpdateManager', 'Manual update check requested by user');
    
    this.appVersionService.checkForUpdates()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (result) => {
          this.handleManualUpdateCheck(result);
        },
        error: (error) => {
          this.logService.log(LevelLogEnum.ERROR, 'AppUpdateManager', 'Error in manual update check', error);
          this.showUpdateCheckError();
        }
      });
  }

  /**
   * Handle manual update check result (with user feedback)
   */
  private handleManualUpdateCheck(result: VersionCheckResult): void {
    // Check for maintenance mode first
    if (result.isMaintenanceMode) {
      this.handleMaintenanceMode(result);
      return;
    }

    // Check for force update
    if (result.forceUpdate) {
      this.handleForceUpdate(result);
      return;
    }

    // Check for optional update
    if (result.needsUpdate) {
      this.handleOptionalUpdate(result);
    } else {
      // No updates available - show success message
      this.showNoUpdatesAvailable(result);
    }
  }

  /**
   * Show message when no updates are available
   */
  private showNoUpdatesAvailable(result: VersionCheckResult): void {
    this.alertService.showAlert(
      this.getTranslation('APP.UPDATE.CURRENT.TITLE'),
      this.getTranslation('APP.UPDATE.CURRENT.MESSAGE'),
      Alerts.SUCCESS,
      undefined,
      true,
      this.getTranslation('button.ok')
    );
  }

  /**
   * Show error message when update check fails
   */
  private showUpdateCheckError(): void {
    this.alertService.showAlert(
      this.getTranslation('APP.UPDATE.ERROR.TITLE'),
      this.getTranslation('APP.UPDATE.ERROR.MESSAGE'),
      Alerts.ERROR,
      undefined,
      true,
      this.getTranslation('button.ok')
    );
  }

  /**
   * Force check for updates (internal use - no user feedback)
   */
  private internalCheckForUpdates(): void {
    this.appVersionService.forceVersionCheck()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (result) => {
          this.handleVersionCheckResult(result);
        },
        error: (error) => {
          this.logService.log(LevelLogEnum.ERROR, 'AppUpdateManager', 'Error in forced update check', error);
        }
      });
  }

  /**
   * Check if app is in maintenance mode
   */
  isInMaintenanceMode(): boolean {
    return this.appVersionService.isMaintenanceMode();
  }

  /**
   * Get maintenance message
   */
  getMaintenanceMessage(): string {
    return this.appVersionService.getMaintenanceMessage();
  }

  /**
   * Clear update cache
   */
  clearUpdateCache(): void {
    this.appVersionService.clearVersionCache();
    this.logService.log(LevelLogEnum.INFO, 'AppUpdateManager', 'Update cache cleared');
  }

  /**
   * Pause update checks
   */
  pauseUpdateChecks(): void {
    if (this.updateCheckSubscription) {
      this.updateCheckSubscription.unsubscribe();
      this.updateCheckSubscription = null;
    }
  }

  /**
   * Resume update checks
   */
  resumeUpdateChecks(): void {
    if (!this.updateCheckSubscription) {
      this.setupPeriodicUpdateChecks();
    }
  }
} 