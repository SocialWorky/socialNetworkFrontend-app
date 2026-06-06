import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { LogService, LevelLogEnum } from './core-apis/log.service';
import { environment } from '@env/environment';

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
      rare: { type: 'cookie' as const, duration: 24 * 60 * 60 * 1000 } // 24 hours
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

      // Cleaned up orphaned databases - no need to log every cleanup
    } catch (error) {
      // Error cleaning up orphaned databases - no need to log every cleanup error
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
          // Failed to parse cache item during cleanup - no need to log every parse failure
          localStorage.removeItem(key);
        }
      }
    });
  }

  /**
   * Normalize image URL to prevent double base URL prefixing
   * @param url The image URL to normalize
   * @param baseUrl The base URL to check against
   * @returns Normalized URL
   */
  normalizeImageUrl(url: string, baseUrl: string): string {
    if (!url) return '';
    
    // If URL already starts with blob/data, return as is
    if (url.startsWith('blob:') || url.startsWith('data:')) {
      return url;
    }

    // Heal paths corrupted by a stringified base URL (e.g. an unset env var
    // produced "${undefined}/emojis/..."). Strip a stray "undefined/"/"null/"
    // segment, whether it sits at the start or right after the domain.
    url = url
      .replace(/^(undefined|null)\//, '')
      .replace(/(https?:\/\/[^\/]+)\/(?:undefined|null)\//, '$1/');

    // Store original URL for logging if needed
    const originalUrl = url;
    
    // Handle URLs that start with /uploads/, /publications/, /profileImg/, etc. (old format)
    // These are being interpreted as relative paths by the browser
    // Convert them to relative paths without leading slash
    if (url.startsWith('/uploads/') || url.startsWith('/publications/') || 
        url.startsWith('/config/') || url.startsWith('/users/') ||
        url.startsWith('/comments/') || url.startsWith('/thematic-images/') ||
        url.startsWith('/widgets/') || url.startsWith('/profile/') ||
        url.startsWith('/profileImg/')) {
      // Remove leading slash to make it a proper relative path
      url = url.slice(1);
    }
    
    
    // Detect and convert old file-service URLs to relative paths
    // This handles URLs that were saved before the MinIO migration
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // Check if it's an old file-service URL
      const oldFileServicePatterns = [
        /https?:\/\/file-service[^\/]*\.worky\.cl\//,
        /https?:\/\/file-service[^\/]*\.myb-side\.cl\//,
        /https?:\/\/localhost:3005\//,
        /https?:\/\/localhost\/(?!.*:)/  // localhost without port
      ];
      
      for (const pattern of oldFileServicePatterns) {
        if (pattern.test(url)) {
          // Extract the relative path (everything after the domain)
          const match = url.match(/https?:\/\/[^\/]+(\/.+)/);
          if (match && match[1]) {
            // Remove leading slash to get relative path
            url = match[1].startsWith('/') ? match[1].slice(1) : match[1];
            break; // Exit loop once we've converted the URL
          }
        }
      }
      
      // If it's still an absolute URL but not an old file-service URL, return as is
      // (might be an external URL like Google Images, etc.)
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
    }
    
    // If baseUrl is not provided or is undefined, try to get it from environment.
    // Prefer the MinIO bucket URL when configured; otherwise fall back to the
    // file-service URL, which serves files directly from local storage at its
    // root (GET :type/:filename) when no object store is configured.
    let finalBaseUrl = baseUrl;
    if (!finalBaseUrl || finalBaseUrl.trim() === '') {
      finalBaseUrl = environment.MINIO_BUCKET_URL || environment.APIFILESERVICE || '';
    }
    
    // If still no baseUrl and URL looks like a relative path, this is a problem
    if (!finalBaseUrl || finalBaseUrl.trim() === '') {
      // If URL looks like a relative path (starts with publications/, users/, profileImg/, etc.)
      // and we don't have a baseUrl, this is a critical error
      // Check if it's a known MinIO path pattern
      const knownMinIOPatterns = ['profileImg/', 'publications/', 'uploads/', 'config/', 'users/', 'comments/', 'thematic-images/', 'widgets/', 'profile/'];
      const isKnownMinIOPath = knownMinIOPatterns.some(pattern => url.startsWith(pattern) || url.startsWith('/' + pattern));
      
      if (isKnownMinIOPath) {
        // Neither MINIO_BUCKET_URL nor APIFILESERVICE is configured - we cannot build
        // an absolute URL. Return empty string to prevent 404 errors - components
        // should handle empty URLs gracefully.
        console.error('[UtilityService] No storage base URL configured. Cannot normalize URL:', url);
        console.error('[UtilityService] Set NG_APP_MINIO_BUCKET_URL (MinIO) or NG_APP_APIFILESERVICE (local storage) in your environment variables.');
        return ''; // Return empty string instead of relative URL to prevent 404
      }
      
      // Not a known MinIO path, return as is (might be an asset path or something else)
      return url;
    }
    
    // If URL already contains the base URL, return as is
    if (url.includes(finalBaseUrl)) {
      return url;
    }
    
    // Clean base URL (remove trailing slash)
    const cleanBaseUrl = finalBaseUrl.endsWith('/') ? finalBaseUrl.slice(0, -1) : finalBaseUrl;
    
    // Clean the URL - remove leading slash if present, we'll add it
    let cleanUrl = url.startsWith('/') ? url.slice(1) : url;
    
    // If it's already a full URL (http/https/blob/data) or an asset path, return as is
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://') || 
        cleanUrl.startsWith('blob:') || cleanUrl.startsWith('data:') || 
        cleanUrl.startsWith('assets/')) {
      return cleanUrl;
    }
    
    // At this point, cleanUrl is a relative path that needs to be normalized
    // Examples: "profileImg/compressed|...", "publications/...", "config/...", etc.
    
    // For MinIO, handle special characters properly
    // New files use / (forward slash) instead of | (pipe) for better compatibility
    // Old files may still have | which needs proper encoding
    // MinIO requires proper URL encoding for special characters in object names
    if (cleanUrl.includes('|') || cleanUrl.includes(' ') || cleanUrl.includes('%') || cleanUrl.includes('&')) {
      // Split by / to preserve path structure, then encode each segment separately
      const urlParts = cleanUrl.split('/');
      cleanUrl = urlParts.map(part => {
        // If the part is already encoded, decode it first to avoid double encoding
        try {
          const decoded = decodeURIComponent(part);
          // Re-encode to ensure proper encoding for MinIO
          // This handles |, spaces, and other special characters
          return encodeURIComponent(decoded);
        } catch {
          // If decoding fails, encode as is
          return encodeURIComponent(part);
        }
      }).join('/');
    }
    
    // Construct final URL
    const finalUrl = `${cleanBaseUrl}/${cleanUrl}`;
    
    return finalUrl;
  }

}
