import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval, merge, firstValueFrom } from 'rxjs';
import { switchMap, catchError, tap, startWith } from 'rxjs/operators';
import { DatabaseManagerService } from './database-manager.service';
import { MessageDatabaseService } from './message-database.service';
import { PublicationDatabaseService } from './publication-database.service';
import { PublicationService } from '@shared/services/core-apis/publication.service';
import { AuthService } from '@auth/services/auth.service';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';

export interface SyncStatus {
  isSyncing: boolean;
  lastSync: Date | null;
  error: string | null;
  progress: number;
}

export interface SyncConfig {
  autoSync: boolean;
  syncInterval: number; // in milliseconds
  syncOnConnect: boolean;
  syncOnLogin: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private readonly DEFAULT_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly SYNC_CONFIG_KEY = 'sync_config';

  private syncStatus$ = new BehaviorSubject<SyncStatus>({
    isSyncing: false,
    lastSync: null,
    error: null,
    progress: 0
  });

  private syncConfig: SyncConfig = {
    autoSync: true,
    syncInterval: this.DEFAULT_SYNC_INTERVAL,
    syncOnConnect: true,
    syncOnLogin: true
  };

  private syncInProgress = false;

  constructor(
    private databaseManager: DatabaseManagerService,
    private messageDatabase: MessageDatabaseService,
    private publicationDatabase: PublicationDatabaseService,
    private publicationService: PublicationService,
    private authService: AuthService,
    private logService: LogService
  ) {
    this.loadSyncConfig();
    this.initializeAutoSync();
  }

  /**
   * Get sync status observable
   */
  getSyncStatus(): Observable<SyncStatus> {
    return this.syncStatus$.asObservable();
  }

  /**
   * Get current sync status
   */
  getCurrentSyncStatus(): SyncStatus {
    return this.syncStatus$.value;
  }

  /**
   * Get sync configuration
   */
  getSyncConfig(): SyncConfig {
    return { ...this.syncConfig };
  }

  /**
   * Update sync configuration
   */
  updateSyncConfig(config: Partial<SyncConfig>): void {
    this.syncConfig = { ...this.syncConfig, ...config };
    this.saveSyncConfig();
    this.initializeAutoSync();
  }

  /**
   * Manual sync trigger
   */
  async triggerSync(): Promise<void> {
    if (this.syncInProgress) {
      this.logService.log(
        LevelLogEnum.WARN,
        'SyncService',
        'Sync already in progress, skipping'
      );
      return;
    }

    await this.performSync();
  }

  /**
   * Perform full sync operation
   */
  private async performSync(): Promise<void> {
    if (!this.databaseManager.isUserDatabasesInitialized()) {
      this.logService.log(
        LevelLogEnum.WARN,
        'SyncService',
        'Databases not initialized, skipping sync'
      );
      return;
    }

    this.syncInProgress = true;
    this.updateSyncStatus({ isSyncing: true, progress: 0, error: null });

    try {
      this.logService.log(
        LevelLogEnum.INFO,
        'SyncService',
        'Starting database sync'
      );

      // Sync messages
      await this.syncMessages();
      this.updateSyncStatus({ progress: 50 });

      // Sync publications
      await this.syncPublications();
      this.updateSyncStatus({ progress: 100 });

      // Update last sync time
      const lastSync = new Date();
      this.updateSyncStatus({ 
        isSyncing: false, 
        lastSync, 
        progress: 100,
        error: null 
      });

      this.logService.log(
        LevelLogEnum.INFO,
        'SyncService',
        'Database sync completed successfully',
        { lastSync }
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      this.updateSyncStatus({ 
        isSyncing: false, 
        error: errorMessage,
        progress: 0 
      });

      this.logService.log(
        LevelLogEnum.ERROR,
        'SyncService',
        'Database sync failed',
        { error: errorMessage }
      );
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync messages with backend
   */
  private async syncMessages(): Promise<void> {
    try {
      // Get local messages
      const localMessages = await this.messageDatabase.getAllMessages();
      
      // For now, we'll skip server message sync until MessageService is properly implemented
      // TODO: Implement server message sync when MessageService is available
      
      this.logService.log(
        LevelLogEnum.INFO,
        'SyncService',
        'Messages sync skipped - MessageService not available',
        { localCount: localMessages.length }
      );
    } catch (error) {
      this.logService.log(
        LevelLogEnum.ERROR,
        'SyncService',
        'Error syncing messages',
        { error: error instanceof Error ? error.message : String(error) }
      );
      throw error;
    }
  }

  /**
   * Sync publications with backend
   */
  private async syncPublications(): Promise<void> {
    try {
      // Get local publications
      const localPublications = await this.publicationDatabase.getAllPublications();
      
      // For now, we'll skip server publication sync until PublicationService is properly implemented
      // TODO: Implement server publication sync when PublicationService is available
      
      this.logService.log(
        LevelLogEnum.INFO,
        'SyncService',
        'Publications sync skipped - PublicationService not available',
        { localCount: localPublications.length }
      );
    } catch (error) {
      this.logService.log(
        LevelLogEnum.ERROR,
        'SyncService',
        'Error syncing publications',
        { error: error instanceof Error ? error.message : String(error) }
      );
      throw error;
    }
  }

  /**
   * Initialize automatic sync
   */
  private initializeAutoSync(): void {
    if (this.syncConfig.autoSync) {
      // Sync on interval
      interval(this.syncConfig.syncInterval).pipe(
        startWith(0), // Start immediately
        switchMap(() => this.triggerSync())
      ).subscribe();
    }
  }

  /**
   * Update sync status
   */
  private updateSyncStatus(updates: Partial<SyncStatus>): void {
    const currentStatus = this.syncStatus$.value;
    this.syncStatus$.next({ ...currentStatus, ...updates });
  }

  /**
   * Load sync configuration from storage
   */
  private loadSyncConfig(): void {
    try {
      const stored = localStorage.getItem(this.SYNC_CONFIG_KEY);
      if (stored) {
        this.syncConfig = { ...this.syncConfig, ...JSON.parse(stored) };
      }
    } catch (error) {
      this.logService.log(
        LevelLogEnum.ERROR,
        'SyncService',
        'Error loading sync config',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Save sync configuration to storage
   */
  private saveSyncConfig(): void {
    try {
      localStorage.setItem(this.SYNC_CONFIG_KEY, JSON.stringify(this.syncConfig));
    } catch (error) {
      this.logService.log(
        LevelLogEnum.ERROR,
        'SyncService',
        'Error saving sync config',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Handle user login - trigger sync if configured
   */
  onUserLogin(): void {
    if (this.syncConfig.syncOnLogin) {
      this.triggerSync();
    }
  }

  /**
   * Handle network connection - trigger sync if configured
   */
  onNetworkConnect(): void {
    if (this.syncConfig.syncOnConnect) {
      this.triggerSync();
    }
  }

  /**
   * Reset sync status
   */
  resetSyncStatus(): void {
    this.updateSyncStatus({
      isSyncing: false,
      lastSync: null,
      error: null,
      progress: 0
    });
  }
} 