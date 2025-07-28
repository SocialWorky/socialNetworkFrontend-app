import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap, switchMap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { LogService, LevelLogEnum } from './core-apis/log.service';
import { UtilityService } from './utility.service';
import { APP_VERSION_CONFIG } from '../../../../app-version.config';

export interface AppVersion {
  version: string;
  buildNumber: string;
  releaseDate: string;
  minRequiredVersion?: string;
  forceUpdate: boolean;
  changelog?: string;
  downloadUrl?: string;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
}

export interface VersionCheckResult {
  currentVersion: string;
  serverVersion: AppVersion;
  needsUpdate: boolean;
  forceUpdate: boolean;
  isMaintenanceMode: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AppVersionService {
  private readonly VERSION_KEY = 'app_version_cache';
  private readonly VERSION_CHECK_INTERVAL = 1000 * 60 * 30; // 30 minutes
  
  private currentVersion = APP_VERSION_CONFIG.version; // Get from app-version.config.ts
  private versionCheckSubject = new BehaviorSubject<VersionCheckResult | null>(null);
  private lastCheckTime = 0;

  constructor(
    private http: HttpClient,
    private logService: LogService,
    private utilityService: UtilityService
  ) {
    this.logService.log(LevelLogEnum.INFO, 'AppVersionService', 'Service initialized', { currentVersion: this.currentVersion });
  }

  /**
   * Check for app updates
   */
  checkForUpdates(): Observable<VersionCheckResult> {
    const now = Date.now();
    
    // Check if we should skip the check (rate limiting)
    if (now - this.lastCheckTime < this.VERSION_CHECK_INTERVAL) {
      const cachedResult = this.getCachedVersionCheck();
      if (cachedResult) {
        return of(cachedResult);
      }
    }

    return this.http.get<any>(`${environment.API_URL}/app/version`).pipe(
      tap(() => {
        this.lastCheckTime = now;
      }),
      switchMap(response => {
                // Extract server version from response (handle different response formats)
        let serverVersion: AppVersion;
        if (response.success && response.data) {
          // Backend returns {success: true, data: {...}}
          serverVersion = response.data;
        } else if (response.version) {
          // Backend returns version data directly
          serverVersion = response;
        } else {
          this.logService.log(LevelLogEnum.ERROR, 'AppVersionService', 'Unexpected backend response format', { response });
          throw new Error('Invalid backend response format');
        }
        
        const result = this.compareVersions(serverVersion);
        this.cacheVersionCheck(result);
        this.versionCheckSubject.next(result);
        return of(result);
      }),
      catchError(error => {
        this.logService.log(LevelLogEnum.ERROR, 'AppVersionService', 'Error checking for app updates', error);
        // Return cached result or default
        const cachedResult = this.getCachedVersionCheck();
        return of(cachedResult || this.getDefaultVersionCheck());
      })
    );
  }

  /**
   * Compare current version with server version
   */
    private compareVersions(serverVersion: AppVersion): VersionCheckResult {
    const currentVersionParts = this.currentVersion.split('.').map(Number);
    const serverVersionParts = serverVersion.version.split('.').map(Number);

    let needsUpdate = false;
    let forceUpdate = false;

    // Compare versions
    for (let i = 0; i < Math.max(currentVersionParts.length, serverVersionParts.length); i++) {
      const current = currentVersionParts[i] || 0;
      const server = serverVersionParts[i] || 0;
      
      if (server > current) {
        needsUpdate = true;
        break;
      } else if (server < current) {
        break;
      }
    }

    // Check if force update is required (only if there's actually an update available)
    if (serverVersion.forceUpdate && needsUpdate) {
      forceUpdate = true;
    }

    // Check minimum required version
    if (serverVersion.minRequiredVersion) {
      const minRequiredParts = serverVersion.minRequiredVersion.split('.').map(Number);
      for (let i = 0; i < Math.max(currentVersionParts.length, minRequiredParts.length); i++) {
        const current = currentVersionParts[i] || 0;
        const minRequired = minRequiredParts[i] || 0;
        
        if (current < minRequired) {
          forceUpdate = true;
          needsUpdate = true;
          break;
        } else if (current > minRequired) {
          break;
        }
      }
    }

    const result = {
      currentVersion: this.currentVersion,
      serverVersion,
      needsUpdate,
      forceUpdate,
      isMaintenanceMode: serverVersion.maintenanceMode || false
    };
    
    return result;
  }

  /**
   * Get version check result as observable
   */
  getVersionCheckResult(): Observable<VersionCheckResult | null> {
    return this.versionCheckSubject.asObservable();
  }

  /**
   * Force a version check (bypasses cache)
   */
  forceVersionCheck(): Observable<VersionCheckResult> {
    this.lastCheckTime = 0; // Reset last check time
    return this.checkForUpdates();
  }

  /**
   * Get current version
   */
  getCurrentVersion(): string {
    return this.currentVersion;
  }

  /**
   * Cache version check result
   */
  private cacheVersionCheck(result: VersionCheckResult): void {
    try {
      const cacheData = {
        result,
        timestamp: Date.now()
      };
      localStorage.setItem(this.VERSION_KEY, JSON.stringify(cacheData));
    } catch (error) {
      this.logService.log(LevelLogEnum.ERROR, 'AppVersionService', 'Error caching version check', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * Get cached version check result
   */
  private getCachedVersionCheck(): VersionCheckResult | null {
    try {
      const cached = localStorage.getItem(this.VERSION_KEY);
      if (cached) {
        const cacheData = JSON.parse(cached);
        const cacheAge = Date.now() - cacheData.timestamp;
        
        // Cache is valid for 1 hour
        if (cacheAge < 1000 * 60 * 60) {
          return cacheData.result;
        }
      }
    } catch (error) {
      this.logService.log(LevelLogEnum.ERROR, 'AppVersionService', 'Error reading cached version check', { error: error instanceof Error ? error.message : String(error) });
    }
    return null;
  }

  /**
   * Get default version check result
   */
  private getDefaultVersionCheck(): VersionCheckResult {
    return {
      currentVersion: this.currentVersion,
      serverVersion: {
        version: this.currentVersion,
        buildNumber: '1',
        releaseDate: new Date().toISOString(),
        forceUpdate: false
      },
      needsUpdate: false,
      forceUpdate: false,
      isMaintenanceMode: false
    };
  }

  /**
   * Clear version cache
   */
  clearVersionCache(): void {
    try {
      localStorage.removeItem(this.VERSION_KEY);
    } catch (error) {
      this.logService.log(LevelLogEnum.ERROR, 'AppVersionService', 'Error clearing version cache', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * Check if app is in maintenance mode
   */
  isMaintenanceMode(): boolean {
    const cachedResult = this.getCachedVersionCheck();
    return cachedResult?.isMaintenanceMode || false;
  }

  /**
   * Get maintenance message
   */
  getMaintenanceMessage(): string {
    const cachedResult = this.getCachedVersionCheck();
    return cachedResult?.serverVersion.maintenanceMessage || 'App is currently under maintenance. Please try again later.';
  }
} 