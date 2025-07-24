import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { LogService, LevelLogEnum } from './core-apis/log.service';

@Injectable({
  providedIn: 'root',
})
export class UtilityService {

  private unsubscribe$ = new Subject<void>();

  constructor(private logService: LogService) {}

  /**
   * Pausa la ejecución durante un tiempo determinado.
   * @param ms - Tiempo en milisegundos.
   * @returns Una promesa que se resuelve después del tiempo especificado.
   */
  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPassword(password: string): boolean {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
    return passwordRegex.test(password);
  }

  isVideoUrl(url: string): boolean {
    return /\.(mp4|ogg|webm|avi|mov)$/i.test(url);
  }

  /**
   * Handles image loading errors by setting a fallback image.
   * This method is used to provide a default image when the original image URL fails to load.
   * @param event - The error event from the img element
   * @param fallbackSrc - The fallback image URL to use when the original image fails
   */
  handleImageError(event: Event, fallbackSrc: string): void {
    const imgElement = event.target as HTMLImageElement;
    
    // Prevent console errors by removing the error event listener
    imgElement.onerror = null;
    
    // Set the fallback image
    imgElement.src = fallbackSrc;
    
    // Add error handling for the fallback image as well
    imgElement.onerror = () => {
      imgElement.onerror = null;
      imgElement.style.display = 'none';
    };
  }

  /**
   * Creates an image element with error handling to prevent console errors.
   * This method is used to preload images and handle errors silently.
   * @param src - The image source URL
   * @param fallbackSrc - The fallback image URL
   * @returns A promise that resolves with the successful image URL or rejects with the fallback URL
   */
  preloadImage(src: string, fallbackSrc: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Check if the URL is localhost and might fail
      if (src.includes('localhost:3005')) {
        // For localhost URLs, use fallback immediately to avoid connection errors
        resolve(fallbackSrc);
        return;
      }

      // For non-localhost URLs, use the original approach
      const img = new Image();
      const timeout = setTimeout(() => {
        img.onload = null;
        img.onerror = null;
        resolve(fallbackSrc);
      }, 3000); // 3 second timeout
      
      img.onload = () => {
        clearTimeout(timeout);
        resolve(src);
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        // Try fallback image
        const fallbackImg = new Image();
        const fallbackTimeout = setTimeout(() => {
          fallbackImg.onload = null;
          fallbackImg.onerror = null;
          reject(fallbackSrc);
        }, 3000);
        
        fallbackImg.onload = () => {
          clearTimeout(fallbackTimeout);
          resolve(fallbackSrc);
        };
        fallbackImg.onerror = () => {
          clearTimeout(fallbackTimeout);
          reject(fallbackSrc);
        };
        fallbackImg.src = fallbackSrc;
      };
      
      img.src = src;
    });
  }

  /**
   * Optimiza el almacenamiento de datos según el tipo y frecuencia de uso
   */
  optimizeStorage(key: string, data: any, type: 'frequent' | 'occasional' | 'rare'): void {
    const storageConfig = {
      frequent: { type: 'memory' as const, duration: 5 * 60 * 1000 }, // 5 min
      occasional: { type: 'localStorage' as const },
      rare: { type: 'cookie' as const, duration: 24 * 60 * 60 * 1000 } // 24 horas
    };

    const config = storageConfig[type];
    // You could use StorageService here
  }

  /**
   * Database management utilities
   */
  
  /**
   * Check if IndexedDB is supported
   */
  isIndexedDBSupported(): boolean {
    return 'indexedDB' in window;
  }

  /**
   * Get database size in bytes
   */
  async getDatabaseSize(dbName: string): Promise<number> {
    if (!this.isIndexedDBSupported()) {
      return 0;
    }

    return new Promise((resolve) => {
      const request = indexedDB.open(dbName);
      request.onsuccess = () => {
        const db = request.result;
        let size = 0;
        
        // Estimate size by iterating through object stores
        Array.from(db.objectStoreNames).forEach(storeName => {
          const transaction = db.transaction(storeName, 'readonly');
          const store = transaction.objectStore(storeName);
          const countRequest = store.count();
          
          countRequest.onsuccess = () => {
            // Rough estimate: 1KB per record
            size += countRequest.result * 1024;
          };
        });
        
        db.close();
        resolve(size);
      };
      request.onerror = () => resolve(0);
    });
  }

  /**
   * Clean up old databases for users that no longer exist
   */
  async cleanupOrphanedDatabases(currentUserId: string): Promise<void> {
    if (!this.isIndexedDBSupported()) {
      return;
    }

    try {
      const databases = await indexedDB.databases();
      const currentUserDatabases = databases.filter(db => 
        db.name?.includes('Worky') && !db.name?.includes(currentUserId)
      );

      for (const db of currentUserDatabases) {
        if (db.name) {
          await this.deleteDatabase(db.name);
        }
      }

      this.logService.log(
        LevelLogEnum.INFO,
        'UtilityService',
        'Cleaned up orphaned databases',
        { cleanedCount: currentUserDatabases.length }
      );
    } catch (error) {
      this.logService.log(
        LevelLogEnum.ERROR,
        'UtilityService',
        'Error cleaning up orphaned databases',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Delete a specific database
   */
  private async deleteDatabase(dbName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(dbName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Preload crítico para red social
   */
  preloadCriticalAssets(): void {
    const criticalAssets = [
      '/assets/img/shared/handleImageError.png',
      '/assets/icons/icon-worky-72x72.png'
    ];

    criticalAssets.forEach(asset => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = asset.endsWith('.png') ? 'image' : 'fetch';
      link.href = asset;
      document.head.appendChild(link);
    });
  }

  /**
   * Limpia caché obsoleto
   */
  cleanupOldCache(): void {
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('cache_')) {
        try {
          const item = JSON.parse(localStorage.getItem(key) || '{}');
          if (item.timestamp && (now - item.timestamp) > maxAge) {
            localStorage.removeItem(key);
          }
        } catch (error) {
          this.logService.log(
            LevelLogEnum.ERROR,
            'UtilityService',
            'Failed to parse cache item during cleanup',
            { key, error: error instanceof Error ? error.message : String(error) }
          );
          localStorage.removeItem(key);
        }
      }
    });
  }

}
