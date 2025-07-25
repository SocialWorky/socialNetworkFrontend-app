import { Injectable } from '@angular/core';
import { PublicationView } from '@shared/interfaces/publicationView.interface';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';

@Injectable({
  providedIn: 'root'
})
export class PublicationDatabaseService {
  private readonly DB_BASE_NAME = 'WorkyPublicationsDB';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'publications';
  private readonly MAX_PUBLICATIONS = 150;
  private db: IDBDatabase | null = null;
  private currentUserId: string | null = null;

  constructor(
    private logService: LogService
  ) {}

  /**
   * Get database name with user ID
   */
  private getDatabaseName(): string {
    // Get user ID from localStorage to avoid circular dependency
    const token = localStorage.getItem('token');
    if (token && token !== 'undefined' && token !== 'null') {
      try {
        const decodedToken = JSON.parse(atob(token.split('.')[1]));
        const userId = decodedToken.id;
        return userId ? `${this.DB_BASE_NAME}_${userId}` : this.DB_BASE_NAME;
      } catch (error) {
        return this.DB_BASE_NAME;
      }
    }
    return this.DB_BASE_NAME;
  }

  /**
   * Check if user has changed and close current database
   */
  private checkUserChange(): void {
    // Get user ID from localStorage to avoid circular dependency
    const token = localStorage.getItem('token');
    let userId = null;
    
    if (token && token !== 'undefined' && token !== 'null') {
      try {
        const decodedToken = JSON.parse(atob(token.split('.')[1]));
        userId = decodedToken.id;
      } catch (error) {
        userId = null;
      }
    }
    
    if (userId !== this.currentUserId) {
      this.currentUserId = userId;
      this.db = null; // Force re-initialization
    }
  }

  async initDatabase(): Promise<void> {
    this.checkUserChange();
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.getDatabaseName(), this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: '_id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
    });
  }

  async addPublication(publication: PublicationView): Promise<void> {
    if (!this.db) await this.initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      const request = store.put(publication);
      
      request.onsuccess = () => {
        this.ensureMaxPublications();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async addPublications(publications: PublicationView[]): Promise<void> {
    if (!this.db) await this.initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      let completed = 0;
      const total = publications.length;
      
      publications.forEach(publication => {
        const request = store.put(publication);
        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            this.ensureMaxPublications();
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  async getPublication(id: string): Promise<PublicationView | null> {
    if (!this.db) await this.initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllPublications(): Promise<PublicationView[]> {
    if (!this.db) await this.initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('createdAt');
      const request = index.getAll();
      
      request.onsuccess = () => {
        const publications = request.result as PublicationView[];
        publications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(publications);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updatePublication(publication: PublicationView): Promise<void> {
    if (!this.db) await this.initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      const request = store.put(publication);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deletePublication(id: string): Promise<void> {
    if (!this.db) await this.initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllPublications(): Promise<void> {
    if (!this.db) await this.initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete the entire database for the current user
   */
  /**
   * Close database connection without deleting the database
   */
  async closeConnection(): Promise<void> {
    try {
      if (this.db) {
        this.db.close();
        this.db = null;
        this.logService.log(
          LevelLogEnum.INFO,
          'PublicationDatabaseService',
          'Database connection closed',
          { dbName: this.getDatabaseName() }
        );
      }
    } catch (error) {
      this.logService.log(
        LevelLogEnum.ERROR,
        'PublicationDatabaseService',
        'Error closing database connection',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  async deleteDatabase(): Promise<void> {
    try {
      // Close current connection
      if (this.db) {
        this.db.close();
        this.db = null;
      }

      // Delete the database
      const dbName = this.getDatabaseName();
      const deleteRequest = indexedDB.deleteDatabase(dbName);
      
      return new Promise((resolve, reject) => {
        deleteRequest.onsuccess = () => {
          this.logService.log(
            LevelLogEnum.INFO,
            'PublicationDatabaseService',
            'Database deleted successfully',
            { dbName }
          );
          this.currentUserId = null;
          resolve();
        };
        
        deleteRequest.onerror = () => {
          this.logService.log(
            LevelLogEnum.ERROR,
            'PublicationDatabaseService',
            'Error deleting database',
            { dbName, error: deleteRequest.error }
          );
          reject(deleteRequest.error);
        };
      });
    } catch (error) {
      this.logService.log(
        LevelLogEnum.ERROR,
        'PublicationDatabaseService',
        'Error in deleteDatabase',
        { error: error instanceof Error ? error.message : String(error) }
      );
      throw error;
    }
  }

  private async ensureMaxPublications(): Promise<void> {
    const publications = await this.getAllPublications();
    
    if (publications.length > this.MAX_PUBLICATIONS) {
      const publicationsToDelete = publications.slice(this.MAX_PUBLICATIONS);
      
      for (const publication of publicationsToDelete) {
        await this.deletePublication(publication._id);
      }
    }
  }

  async getPublicationCount(): Promise<number> {
    if (!this.db) await this.initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.count();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getPublicationsWithTimestamp(): Promise<{publication: PublicationView, lastSync: number}[]> {
    if (!this.db) await this.initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const publications = request.result as PublicationView[];
        const publicationsWithTimestamp = publications.map(pub => ({
          publication: pub,
          lastSync: new Date(pub.updatedAt).getTime()
        }));
        resolve(publicationsWithTimestamp);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updatePublicationsIfChanged(serverPublications: PublicationView[]): Promise<{
    updated: PublicationView[],
    new: PublicationView[],
    unchanged: PublicationView[]
  }> {
    const localPublications = await this.getPublicationsWithTimestamp();
    const result = {
      updated: [] as PublicationView[],
      new: [] as PublicationView[],
      unchanged: [] as PublicationView[]
    };

    for (const serverPub of serverPublications) {
      const localPub = localPublications.find(lp => lp.publication._id === serverPub._id);
      
      if (!localPub) {
        result.new.push(serverPub);
        await this.addPublication(serverPub);
      } else {
        const serverTimestamp = new Date(serverPub.updatedAt).getTime();
        
        if (serverTimestamp > localPub.lastSync) {
          result.updated.push(serverPub);
          await this.updatePublication(serverPub);
        } else {
          result.unchanged.push(localPub.publication);
        }
      }
    }

    return result;
  }

  async getLocalPublicationsPaginated(page: number, size: number): Promise<{
    publications: PublicationView[],
    total: number
  }> {
    const allPublications = await this.getAllPublications();
    
    const startIndex = (page - 1) * size;
    const endIndex = startIndex + size;
    const paginatedPublications = allPublications.slice(startIndex, endIndex);
    
    return {
      publications: paginatedPublications,
      total: allPublications.length
    };
  }

  /**
   * Sincroniza publicaciones específicas con el servidor
   */
  async syncSpecificPublications(publicationIds: string[]): Promise<PublicationView[]> {
    if (publicationIds.length === 0) {
      return [];
    }

    const updatedPublications: PublicationView[] = [];
    
    for (const id of publicationIds) {
      try {
        const publication = await this.getPublication(id);
        if (publication) {
          updatedPublications.push(publication);
        }
      } catch (error) {
        this.logService.log(LevelLogEnum.ERROR, 'PublicationDatabaseService', 'Error sincronizando publicación', { id, error });
      }
    }

    return updatedPublications;
  }
} 
