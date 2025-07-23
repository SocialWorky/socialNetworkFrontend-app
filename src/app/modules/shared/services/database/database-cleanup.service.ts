import { Injectable } from '@angular/core';
import { DatabaseManagerService } from './database-manager.service';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';

@Injectable({
  providedIn: 'root'
})
export class DatabaseCleanupService {
  constructor(
    private databaseManager: DatabaseManagerService,
    private logService: LogService
  ) {}

  /**
   * Clean up all user databases on logout
   */
  async cleanupOnLogout(): Promise<void> {
    try {
      await this.databaseManager.clearAllUserData();
      this.logService.log(
        LevelLogEnum.INFO,
        'DatabaseCleanupService',
        'User databases cleared successfully on logout'
      );
    } catch (error) {
      this.logService.log(
        LevelLogEnum.ERROR,
        'DatabaseCleanupService',
        'Error clearing user databases on logout',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }
} 