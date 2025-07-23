import { Injectable } from '@angular/core';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { MessageDatabaseService } from './message-database.service';
import { PublicationDatabaseService } from './publication-database.service';
import { UtilityService } from '@shared/services/utility.service';

export interface DatabaseConfig {
  name: string;
  version: number;
  stores: string[];
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseManagerService {
  private readonly DATABASES: DatabaseConfig[] = [
    {
      name: 'WorkyMessagesDB',
      version: 2,
      stores: ['messages']
    },
    {
      name: 'WorkyPublicationsDB',
      version: 1,
      stores: ['publications']
    }
  ];

  private currentUserId: string | null = null;
  private isInitialized = false;

  constructor(
    private messageDatabase: MessageDatabaseService,
    private publicationDatabase: PublicationDatabaseService,
    private logService: LogService,
    private utilityService: UtilityService
  ) {
    this.initializeUserTracking();
  }

  /**
   * Initialize user tracking and database management
   */
  private initializeUserTracking(): void {
    // Don't clean up on app start - only when user changes
    // This prevents deleting current user's databases on page refresh
  }

    /**
   * Clean up orphaned databases for a specific user (called during login)
   * ESTRATEGIA REAL: Eliminar realmente las bases de datos que existen
   */
  private async cleanupOrphanedDatabasesForUser(userId: string): Promise<void> {
    try {
      this.logService.log(
        LevelLogEnum.INFO,
        'DatabaseManagerService',
        'Starting database cleanup for user change.',
        { 
          newUserId: userId, 
          previousUserId: this.currentUserId,
          userAgent: navigator.userAgent 
        }
      );

      // Define the "allow-list" of databases that should be kept for the current user.
      const databasesToKeep = [
        `WorkyMessagesDB_${userId}`,
        `WorkyPublicationsDB_${userId}`
      ];

      this.logService.log(
        LevelLogEnum.INFO,
        'DatabaseManagerService',
        'Allow-list defined. These databases will be preserved.',
        { databasesToKeep, count: databasesToKeep.length, newUserId: userId }
      );

      // Step 1: Close all existing connections to prevent locking issues.
      this.logService.log(LevelLogEnum.INFO, 'DatabaseManagerService', 'Step 1: Closing all existing connections.');
      if (this.messageDatabase) await this.messageDatabase.closeConnection();
      if (this.publicationDatabase) await this.publicationDatabase.closeConnection();

      // Step 2: Get all existing Worky-related databases directly from the browser.
      this.logService.log(LevelLogEnum.INFO, 'DatabaseManagerService', 'Step 2: Detecting all existing Worky databases.');
      const existingDatabases = await this.getExistingWorkyDatabases();
      
      this.logService.log(
        LevelLogEnum.INFO,
        'DatabaseManagerService',
        'Detection complete. Found databases to check against allow-list.',
        { existingDatabases, count: existingDatabases.length, newUserId: userId }
      );

      // Step 3: Decide which databases to delete by comparing against the allow-list.
      const databasesToDelete: string[] = [];
      for (const dbName of existingDatabases) {
        if (!databasesToKeep.includes(dbName)) {
          databasesToDelete.push(dbName);
        }
      }

      this.logService.log(
        LevelLogEnum.INFO,
        'DatabaseManagerService',
        'Final Deletion Plan',
        { 
          toDelete: databasesToDelete,
          toDeleteCount: databasesToDelete.length,
          toKeep: databasesToKeep,
          toKeepCount: databasesToKeep.length,
          note: 'Only databases not on the allow-list will be deleted.' 
        }
      );

      // Step 4: Execute the deletion plan.
      if (databasesToDelete.length > 0) {
        this.logService.log(LevelLogEnum.INFO, 'DatabaseManagerService', 'Step 4: Executing deletion plan.');
        for (const dbName of databasesToDelete) {
          // Individual deletion logs are in deleteDatabaseByName
          await this.deleteDatabaseByName(dbName);
        }
      } else {
        this.logService.log(LevelLogEnum.INFO, 'DatabaseManagerService', 'Step 4: No databases to delete. Cleanup not needed.');
      }

      this.logService.log(
        LevelLogEnum.INFO,
        'DatabaseManagerService',
        'Database cleanup completed successfully.',
        { 
          newUserId: userId, 
          deletedCount: databasesToDelete.length,
          keptCount: databasesToKeep.length 
        }
      );

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logService.log(
        LevelLogEnum.ERROR,
        'DatabaseManagerService',
        'Error during database cleanup.',
        { 
          userId,
          errorMessage: err.message,
          errorStack: err.stack,
          errorObject: err
        }
      );
    }
  }

  /**
   * Gets all existing IndexedDB databases for the current origin and filters them for "Worky" databases.
   * This is the most reliable way to find all relevant databases.
   */
  private async getExistingWorkyDatabases(): Promise<string[]> {
    this.logService.log(LevelLogEnum.INFO, 'DatabaseManagerService', 'Detecting existing databases...');
    
    const apiAvailable = 'databases' in indexedDB && typeof indexedDB.databases === 'function';
    this.logService.log(LevelLogEnum.INFO, 'DatabaseManagerService', 'Checking for indexedDB.databases() API support.', { apiAvailable });

    if (apiAvailable) {
      try {
        const allDbs = await indexedDB.databases();
        const dbNames = allDbs.map(db => db.name).filter((name): name is string => !!name);
        
        this.logService.log(LevelLogEnum.INFO, 'DatabaseManagerService', 'Successfully fetched database list via modern API.', {
          totalFound: dbNames.length,
          databaseNames: dbNames
        });
        
        const workyDbs = dbNames.filter(name => name.startsWith('Worky'));
          
        this.logService.log(LevelLogEnum.INFO, 'DatabaseManagerService', 'Filtered for Worky-specific databases.', { 
          workyDbCount: workyDbs.length,
          workyDbNames: workyDbs
        });
        return workyDbs;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.logService.log(LevelLogEnum.WARN, 'DatabaseManagerService', 'Modern API indexedDB.databases() failed, falling back to legacy method.', { 
          errorMessage: err.message,
          errorStack: err.stack 
        });
      }
    }

    // Fallback for older browsers or environments where indexedDB.databases() is not available.
    this.logService.log(LevelLogEnum.WARN, 'DatabaseManagerService', 'Using legacy fallback method to find databases by guessing names.');
    const knownUserIds = this.getKnownUserIds();
    const legacyDbNames = ['WorkyMessagesDB', 'WorkyPublicationsDB'];
    const userDbNames = knownUserIds.flatMap(id => [`WorkyMessagesDB_${id}`, `WorkyPublicationsDB_${id}`]);
    const allPossibleDbNames = [...new Set([...legacyDbNames, ...userDbNames])];
    
    const existingDatabases: string[] = [];
    for (const dbName of allPossibleDbNames) {
      if (await this.databaseExists(dbName)) {
        existingDatabases.push(dbName);
      }
    }
    this.logService.log(LevelLogEnum.INFO, 'DatabaseManagerService', 'Found databases using legacy name-guessing method.', { 
      foundCount: existingDatabases.length,
      foundDbNames: existingDatabases 
    });
    return existingDatabases;
  }

  /**
   * Get current user ID from token
   */
  private getCurrentUserIdFromToken(): string | null {
    const token = localStorage.getItem('token');
    if (token && token !== 'undefined' && token !== 'null') {
      try {
        const decodedToken = JSON.parse(atob(token.split('.')[1]));
        return decodedToken.id || null;
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  /**
   * Delete databases for a specific user ID
   */
  private async deleteUserDatabases(userId: string): Promise<void> {
    const baseNames = ['WorkyMessagesDB', 'WorkyPublicationsDB'];
    
    for (const baseName of baseNames) {
      const dbName = `${baseName}_${userId}`;
      this.logService.log(
        LevelLogEnum.INFO,
        'DatabaseManagerService',
        'Deleting user database',
        { dbName, userId }
      );
      await this.deleteDatabaseByName(dbName);
    }
  }

  /**
   * Get user IDs that might be stored in various places
   */
  private getStoredUserIds(): string[] {
    const userIds: string[] = [];
    
    // Check sessionStorage for any stored user IDs
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.includes('userId') || key && key.includes('user_id')) {
        try {
          const value = sessionStorage.getItem(key);
          if (value && value !== 'undefined' && value !== 'null') {
            userIds.push(value);
          }
        } catch (error) {
          // Ignore invalid values
        }
      }
    }

    // Check localStorage for any stored user IDs
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('userId') || key && key.includes('user_id')) {
        try {
          const value = localStorage.getItem(key);
          if (value && value !== 'undefined' && value !== 'null') {
            userIds.push(value);
          }
        } catch (error) {
          // Ignore invalid values
        }
      }
    }

    return [...new Set(userIds)]; // Remove duplicates
  }

  /**
   * Get known user IDs from various sources
   */
  private getKnownUserIds(): string[] {
    const userIds: string[] = [];
    
    // Get from stored user IDs (sessionStorage and localStorage)
    userIds.push(...this.getStoredUserIds());
    
    // Get from current user ID if set (this is the previous user)
    if (this.currentUserId) {
      userIds.push(this.currentUserId);
    }
    
    // Get from current token if available (this is the new user)
    const token = localStorage.getItem('token');
    if (token && token !== 'undefined' && token !== 'null') {
      try {
        const decodedToken = JSON.parse(atob(token.split('.')[1]));
        if (decodedToken.id) {
          userIds.push(decodedToken.id);
        }
      } catch (error) {
        // Ignore invalid tokens
      }
    }
    
    // Remove duplicates and filter out empty/null values
    const uniqueUserIds = [...new Set(userIds)].filter(id => id && id !== 'undefined' && id !== 'null');
    
    this.logService.log(
      LevelLogEnum.INFO,
      'DatabaseManagerService',
      'Known user IDs found',
      { knownUserIds: uniqueUserIds }
    );
    
    return uniqueUserIds;
  }

  /**
   * Extracts the user ID from a database name (e.g., "WorkyMessagesDB_USER_ID").
   */
  private extractUserIdFromDbName(dbName: string): string | null {
    const match = dbName.match(/_([^_]+)$/);
    return match ? match[1] : null;
  }

  /**
   * Checks if a database exists by trying to open it.
   */
  private async databaseExists(dbName: string): Promise<boolean> {
    return new Promise((resolve) => {
      const request = indexedDB.open(dbName);
      
      request.onsuccess = () => {
        // Database exists, close it immediately
        request.result.close();
        resolve(true);
      };
      
      request.onerror = () => {
        // Database doesn't exist
        resolve(false);
      };
    });
  }

  /**
   * Discover UUIDs by trying to open databases with common UUID patterns
   */
  private async discoverUUIDsFromIndexedDB(): Promise<string[]> {
    const discoveredUUIDs: string[] = [];
    
    // Based on the image, we know there are UUIDs like:
    // b94307d2-ff33-4c4b-aee7-c50047f642b3
    // 4771f737-e892-4ad7-932d-b78a57cd14b1
    
    // Try to discover by checking if databases exist with these patterns
    // We'll try some variations and see what we find
    
    // Check if the databases from the image exist
    const testUUIDs = [
      'b94307d2-ff33-4c4b-aee7-c50047f642b3',
      '4771f737-e892-4ad7-932d-b78a57cd14b1'
    ];
    
    for (const testUUID of testUUIDs) {
      if (await this.databaseExists(`WorkyMessagesDB_${testUUID}`) || 
          await this.databaseExists(`WorkyPublicationsDB_${testUUID}`)) {
        discoveredUUIDs.push(testUUID);
      }
    }
    
    this.logService.log(
      LevelLogEnum.INFO,
      'DatabaseManagerService',
      'Discovered UUIDs from IndexedDB',
      { discoveredUUIDs }
    );
    
    return discoveredUUIDs;
  }

  /**
   * Get all possible UUIDs from various sources (aggressive detection)
   */
  private getAllPossibleUUIDs(): string[] {
    const uuids: string[] = [];
    
    // Get from stored user IDs
    uuids.push(...this.getStoredUserIds());
    
    // Get from current user ID
    if (this.currentUserId) {
      uuids.push(this.currentUserId);
    }
    
    // Get from current token
    const token = localStorage.getItem('token');
    if (token && token !== 'undefined' && token !== 'null') {
      try {
        const decodedToken = JSON.parse(atob(token.split('.')[1]));
        if (decodedToken.id) {
          uuids.push(decodedToken.id);
        }
      } catch (error) {
        // Ignore invalid tokens
      }
    }
    
    // Get from sessionStorage (search for any UUID-like strings)
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        const value = sessionStorage.getItem(key);
        if (value && this.isUUID(value)) {
          uuids.push(value);
        }
      }
    }
    
    // Get from localStorage (search for any UUID-like strings)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value && this.isUUID(value)) {
          uuids.push(value);
        }
      }
    }
    
    // Remove duplicates and filter out empty/null values
    const uniqueUUIDs = [...new Set(uuids)].filter(id => id && id !== 'undefined' && id !== 'null');
    
    this.logService.log(
      LevelLogEnum.INFO,
      'DatabaseManagerService',
      'All possible UUIDs found',
      { allPossibleUUIDs: uniqueUUIDs }
    );
    
    return uniqueUUIDs;
  }

  /**
   * Check if a string looks like a UUID
   */
  private isUUID(str: string): boolean {
    // UUID v4 pattern: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidPattern.test(str);
  }

  /**
   * Delete a specific database by name
   */
  private async deleteDatabaseByName(dbName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.logService.log(
        LevelLogEnum.INFO,
        'DatabaseManagerService',
        'Attempting to delete database.',
        { dbName }
      );

      const deleteRequest = indexedDB.deleteDatabase(dbName);
      
      deleteRequest.onsuccess = (event) => {
        this.logService.log(
          LevelLogEnum.INFO,
          'DatabaseManagerService',
          'Database deletion request successful.',
          { dbName, event }
        );
        resolve();
      };
      
      deleteRequest.onerror = (event) => {
        const error = (event.target as IDBRequest)?.error;
        this.logService.log(
          LevelLogEnum.ERROR,
          'DatabaseManagerService',
          'Error during database deletion attempt.',
          { dbName, errorMessage: error?.message, errorObject: error, event }
        );
        reject(error);
      };

      deleteRequest.onblocked = (event) => {
        this.logService.log(
          LevelLogEnum.WARN,
          'DatabaseManagerService',
          'Database deletion blocked, likely due to an open connection.',
          { dbName, event }
        );
        // Even if blocked, we might want to resolve to not halt the entire cleanup process.
        // However, rejecting helps to know that the cleanup was not fully successful.
        reject(new Error(`Deletion of database ${dbName} was blocked.`));
      };
    });
  }

  /**
   * Check if current user has changed and update databases accordingly
   */
  private async checkAndUpdateCurrentUser(): Promise<void> {
    // This will be called externally when needed
  }

  /**
   * Handle user change by initializing new user data
   */
  private async handleUserChange(newUserId: string | null): Promise<void> {
    try {
      this.currentUserId = newUserId;
      this.isInitialized = false;

      if (newUserId) {
        // Initialize databases for new user
        await this.initializeUserDatabases(newUserId);
      }
    } catch (error) {
      this.logService.log(
        LevelLogEnum.ERROR,
        'DatabaseManagerService',
        'Error handling user change',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Initialize databases for a specific user
   */
  private async initializeUserDatabases(userId: string): Promise<void> {
    try {
      this.logService.log(
        LevelLogEnum.INFO,
        'DatabaseManagerService',
        'Initializing databases for user',
        { userId }
      );

      // Initialize each database service
      await this.messageDatabase.initDatabase();
      await this.publicationDatabase.initDatabase();

      this.isInitialized = true;

      this.logService.log(
        LevelLogEnum.INFO,
        'DatabaseManagerService',
        'Databases initialized successfully',
        { userId }
      );
    } catch (error) {
      this.logService.log(
        LevelLogEnum.ERROR,
        'DatabaseManagerService',
        'Error initializing user databases',
        { userId, error: error instanceof Error ? error.message : String(error) }
      );
      throw error;
    }
  }

  /**
   * Clear all databases when user changes or logs out
   */
  private async clearAllDatabases(): Promise<void> {
    try {
      this.logService.log(
        LevelLogEnum.INFO,
        'DatabaseManagerService',
        'Clearing all databases'
      );

      // Clear each database
      await this.messageDatabase.clearAllMessages();
      await this.publicationDatabase.clearAllPublications();

      this.logService.log(
        LevelLogEnum.INFO,
        'DatabaseManagerService',
        'All databases cleared successfully'
      );
    } catch (error) {
      this.logService.log(
        LevelLogEnum.ERROR,
        'DatabaseManagerService',
        'Error clearing databases',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  /**
   * Check if databases are initialized for current user
   */
  isUserDatabasesInitialized(): boolean {
    return this.isInitialized && !!this.currentUserId;
  }

  /**
   * Initialize databases for a specific user
   */
  async initializeForUser(userId: string): Promise<void> {
    this.logService.log(
      LevelLogEnum.INFO,
      'DatabaseManagerService',
      'initializeForUser called',
      { userId, currentUserId: this.currentUserId }
    );

    // Only clean up if user is actually changing
    if (userId !== this.currentUserId) {
      this.logService.log(
        LevelLogEnum.INFO,
        'DatabaseManagerService',
        'User changed, cleaning up previous user databases and initializing new user',
        { oldUserId: this.currentUserId, newUserId: userId }
      );
      
      // Clean up previous user databases ONLY
      await this.cleanupOrphanedDatabasesForUser(userId);
      await this.handleUserChange(userId);
    } else if (!this.isInitialized) {
      // Same user but databases not initialized (e.g., page refresh)
      this.logService.log(
        LevelLogEnum.INFO,
        'DatabaseManagerService',
        'Same user, databases not initialized, initializing without cleanup',
        { userId }
      );
      await this.handleUserChange(userId);
    } else {
      this.logService.log(
        LevelLogEnum.INFO,
        'DatabaseManagerService',
        'Same user, databases already initialized, skipping',
        { userId }
      );
    }
  }

  /**
   * Force refresh user databases (useful after login/logout)
   */
  async refreshUserDatabases(): Promise<void> {
    // This method is kept for backward compatibility
    // It should be called with a specific user ID
  }

  /**
   * Delete all databases completely (for user change)
   */
  async deleteAllDatabases(): Promise<void> {
    try {
      this.logService.log(
        LevelLogEnum.INFO,
        'DatabaseManagerService',
        'Deleting all databases completely'
      );

      // Delete each database completely
      await this.messageDatabase.deleteDatabase();
      await this.publicationDatabase.deleteDatabase();

      this.logService.log(
        LevelLogEnum.INFO,
        'DatabaseManagerService',
        'All databases deleted successfully'
      );
    } catch (error) {
      this.logService.log(
        LevelLogEnum.ERROR,
        'DatabaseManagerService',
        'Error deleting databases',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Clear all databases and reset state (for logout)
   */
  async clearAllUserData(): Promise<void> {
    await this.clearAllDatabases();
    this.currentUserId = null;
    this.isInitialized = false;
  }

  /**
   * Get database statistics for current user
   */
  async getDatabaseStats(): Promise<{
    messages: number;
    publications: number;
    userId: string | null;
  }> {
    try {
      const messageCount = await this.messageDatabase.getMessageCount();
      const publicationCount = await this.publicationDatabase.getPublicationCount();

      return {
        messages: messageCount,
        publications: publicationCount,
        userId: this.currentUserId
      };
    } catch (error) {
      this.logService.log(
        LevelLogEnum.ERROR,
        'DatabaseManagerService',
        'Error getting database stats',
        { error: error instanceof Error ? error.message : String(error) }
      );
      return {
        messages: 0,
        publications: 0,
        userId: this.currentUserId
      };
    }
  }
}
