import { Injectable } from '@angular/core';
import { LogService, LevelLogEnum } from './core-apis/log.service';

@Injectable({
  providedIn: 'root'
})
export class DatabaseCleanupService {
  private readonly WORKY_DATABASES = [
    'MobileImageCacheDB',
    'WorkyMessagesDB',
    'WorkyPublicationsDB'
  ];

  constructor(private logService: LogService) {}

  /**
   * Clean all Worky-related IndexedDB databases
   */
  async cleanAllWorkyDatabases(): Promise<void> {
    // Starting cleanup of all Worky databases - no need to log every cleanup

    const results = await Promise.allSettled(
      this.WORKY_DATABASES.map(dbName => this.deleteDatabase(dbName))
    );

    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;

    // Cleanup completed - no need to log every cleanup completion

    if (failed > 0) {
      this.logService.log(LevelLogEnum.WARN, 'DatabaseCleanupService', 'Some databases failed to delete', {
        failedCount: failed
      });
    }
  }

  /**
   * Clean a specific database by name
   */
  async cleanDatabase(dbName: string): Promise<void> {
    // Cleaning specific database - no need to log every database cleanup

    try {
      await this.deleteDatabase(dbName);
      // Database cleaned successfully - no need to log every successful cleanup
    } catch (error) {
      this.logService.log(LevelLogEnum.ERROR, 'DatabaseCleanupService', 'Failed to clean database', { 
        dbName, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Get list of all existing Worky databases
   */
  async getExistingWorkyDatabases(): Promise<string[]> {
    if (!('indexedDB' in window)) {
      return [];
    }

    try {
      // Try modern API first
      if ('databases' in indexedDB && typeof indexedDB.databases === 'function') {
        const allDbs = await indexedDB.databases();
        const workyDbs = allDbs
          .map(db => db.name)
          .filter((name): name is string => !!name && name.startsWith('Worky'));
        
        // Found Worky databases via modern API - no need to log every database discovery
        
        return workyDbs;
      }
    } catch (error) {
      // Modern API failed, using fallback method - no need to log every fallback
    }

    // Fallback: check known database names
    const existingDbs: string[] = [];
    
    for (const dbName of this.WORKY_DATABASES) {
      if (await this.databaseExists(dbName)) {
        existingDbs.push(dbName);
      }
    }

    // Found Worky databases via fallback method - no need to log every database discovery

    return existingDbs;
  }

  /**
   * Get database size information
   */
  async getDatabaseInfo(): Promise<Array<{ name: string; exists: boolean; size?: number }>> {
    const info: Array<{ name: string; exists: boolean; size?: number }> = [];

    for (const dbName of this.WORKY_DATABASES) {
      const exists = await this.databaseExists(dbName);
      const size = exists ? await this.getDatabaseSize(dbName) : undefined;
      
      info.push({ name: dbName, exists, size });
    }

    return info;
  }

  /**
   * Check if a database exists
   */
  private async databaseExists(dbName: string): Promise<boolean> {
    return new Promise((resolve) => {
      const request = indexedDB.open(dbName);
      
      request.onsuccess = () => {
        request.result.close();
        resolve(true);
      };
      
      request.onerror = () => {
        resolve(false);
      };
    });
  }

  /**
   * Get approximate database size
   */
  private async getDatabaseSize(dbName: string): Promise<number> {
    return new Promise((resolve) => {
      const request = indexedDB.open(dbName);
      
      request.onsuccess = () => {
        const db = request.result;
        let totalSize = 0;
        
        try {
          Array.from(db.objectStoreNames).forEach(storeName => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const countRequest = store.count();
            
            countRequest.onsuccess = () => {
              // Rough estimate: 1KB per record
              totalSize += countRequest.result * 1024;
            };
          });
        } catch (error) {
          this.logService.log(LevelLogEnum.WARN, 'DatabaseCleanupService', 'Error calculating database size', { dbName, error });
        }
        
        db.close();
        resolve(totalSize);
      };
      
      request.onerror = () => {
        resolve(0);
      };
    });
  }

  /**
   * Delete a specific database
   */
  private async deleteDatabase(dbName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(dbName);
      
      request.onsuccess = () => {
        // Database deletion successful - no need to log every successful deletion
        resolve();
      };
      
      request.onerror = () => {
        const error = request.error;
        this.logService.log(LevelLogEnum.ERROR, 'DatabaseCleanupService', 'Database deletion failed', { 
          dbName, 
          error: error?.message 
        });
        reject(error);
      };
      
      request.onblocked = () => {
        this.logService.log(LevelLogEnum.WARN, 'DatabaseCleanupService', 'Database deletion blocked', { dbName });
        reject(new Error(`Database ${dbName} deletion was blocked`));
      };
    });
  }

  /**
   * Clean orphaned databases (databases not in the known list)
   */
  async cleanOrphanedDatabases(): Promise<void> {
    // Starting cleanup of orphaned databases - no need to log every cleanup

    try {
      const existingDbs = await this.getExistingWorkyDatabases();
      const orphanedDbs = existingDbs.filter(dbName => !this.WORKY_DATABASES.includes(dbName));

      if (orphanedDbs.length === 0) {
        // No orphaned databases found - no need to log every check
        return;
      }

      // Found orphaned databases - no need to log every discovery

      const results = await Promise.allSettled(
        orphanedDbs.map(dbName => this.deleteDatabase(dbName))
      );

      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;

      // Orphaned database cleanup completed - no need to log every cleanup
    } catch (error) {
      this.logService.log(LevelLogEnum.ERROR, 'DatabaseCleanupService', 'Error during orphaned database cleanup', { error });
    }
  }

  /**
   * Force cleanup for Safari iOS issues
   */
  async forceCleanupForSafariIOS(): Promise<void> {
    // Force cleanup for Safari iOS issues - no need to log every cleanup

    try {
      // Clean all databases
      await this.cleanAllWorkyDatabases();
      
      // Clear localStorage items that might be causing issues
      this.clearLocalStorageItems();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Force cleanup completed for Safari iOS - no need to log every cleanup
    } catch (error) {
      this.logService.log(LevelLogEnum.ERROR, 'DatabaseCleanupService', 'Force cleanup failed', { error });
      throw error;
    }
  }

  /**
   * Clear localStorage items that might be causing issues
   */
  private clearLocalStorageItems(): void {
    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('worky') || key.startsWith('Worky') || key.includes('cache'))) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        // Removed localStorage item - no need to log every item removal
      });
      
      // LocalStorage cleanup completed - no need to log every cleanup
    } catch (error) {
      this.logService.log(LevelLogEnum.WARN, 'DatabaseCleanupService', 'Error clearing localStorage', { error });
    }
  }
} 