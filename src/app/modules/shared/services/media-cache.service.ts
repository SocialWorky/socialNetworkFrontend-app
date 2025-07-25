import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError, BehaviorSubject } from 'rxjs';
import { map, catchError, timeout, switchMap } from 'rxjs/operators';
import { CacheService } from './cache.service';
import { LogService, LevelLogEnum } from './core-apis/log.service';
import { environment } from '@env/environment';

export interface MediaCacheOptions {
  quality?: 'low' | 'medium' | 'high';
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  persistent?: boolean;
  preload?: boolean;
}

export interface CachedMedia {
  url: string;
  blob: Blob;
  type: string;
  size: number;
  timestamp: number;
  quality: string;
}

// Interface for serializable cached media (for localStorage)
interface SerializableCachedMedia {
  url: string;
  blobData: string; // base64 encoded blob
  type: string;
  size: number;
  timestamp: number;
  quality: string;
}

@Injectable({
  providedIn: 'root'
})
export class MediaCacheService {
  private readonly CACHE_PREFIX = 'media_cache_';
  private readonly MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB
  private readonly DEFAULT_OPTIONS: MediaCacheOptions = {
    quality: 'medium',
    maxRetries: 3,
    retryDelay: 2000,
    timeout: 30000,
    persistent: true,
    preload: false
  };

  private mediaCache = new Map<string, CachedMedia>();
  private loadingMedia = new Map<string, BehaviorSubject<boolean>>();
  private cacheSize = 0;

  constructor(
    private http: HttpClient,
    private cacheService: CacheService,
    private logService: LogService
  ) {
    this.initializeCache();
  }

  loadMedia(url: string, options: MediaCacheOptions = {}): Observable<string> {
    const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };
    const cacheKey = this.generateCacheKey(url, finalOptions.quality || 'medium');

    if (this.mediaCache.has(cacheKey)) {
      const cached = this.mediaCache.get(cacheKey)!;
      if (this.isCacheValid(cached)) {
        // Validate blob before creating URL
        const objectURL = this.createObjectURL(cached.blob);
        if (objectURL) {
          this.logService.log(LevelLogEnum.INFO, 'MediaCacheService', 'Media loaded from memory cache', { url, quality: finalOptions.quality || 'medium' });
          return of(objectURL);
        } else {
          this.logService.log(LevelLogEnum.WARN, 'MediaCacheService', 'Invalid blob in memory cache', { url });
          this.removeFromCache(cacheKey);
        }
      } else {
        this.removeFromCache(cacheKey);
      }
    }

    const cachedData = this.getFromPersistentCache(cacheKey);
    if (cachedData && this.isCacheValid(cachedData)) {
      // Validate blob before creating URL
      const objectURL = this.createObjectURL(cachedData.blob);
      if (objectURL) {
        this.mediaCache.set(cacheKey, cachedData);
        this.cacheSize += cachedData.size;
        this.logService.log(LevelLogEnum.INFO, 'MediaCacheService', 'Media loaded from persistent cache', { url, quality: finalOptions.quality || 'medium' });
        return of(objectURL);
      } else {
        this.logService.log(LevelLogEnum.WARN, 'MediaCacheService', 'Invalid blob in persistent cache', { url });
        this.cacheService.removeItem(cacheKey, true);
      }
    }

    if (this.loadingMedia.has(cacheKey)) {
      return this.loadingMedia.get(cacheKey)!.asObservable().pipe(
        switchMap(() => {
          const cached = this.mediaCache.get(cacheKey);
          if (cached) {
            const objectURL = this.createObjectURL(cached.blob);
            if (objectURL) {
              return of(objectURL);
            }
          }
          return throwError(() => new Error('Media loading failed'));
        })
      );
    }

    return this.loadFromNetwork(url, cacheKey, finalOptions);
  }

  preloadMedia(urls: string[], options: MediaCacheOptions = {}): void {
    const finalOptions = { ...options, preload: true };
    
    urls.forEach(url => {
      this.loadMedia(url, finalOptions).subscribe({
        next: () => this.logService.log(LevelLogEnum.INFO, 'MediaCacheService', 'Media preloaded successfully', { url }),
        error: (error) => this.logService.log(LevelLogEnum.WARN, 'MediaCacheService', 'Media preload failed', { url, error: error.message })
      });
    });
  }

  getOptimizedUrl(originalUrl: string, connectionQuality: 'slow' | 'medium' | 'fast' = 'medium'): string {
    if (!originalUrl) return '';

    const qualityMap = {
      slow: 'low',
      medium: 'medium',
      fast: 'high'
    };

    const quality = qualityMap[connectionQuality];
    
    if (environment.APIFILESERVICE && originalUrl.includes(environment.APIFILESERVICE)) {
      const separator = originalUrl.includes('?') ? '&' : '?';
      return `${originalUrl}${separator}quality=${quality}`;
    }

    return originalUrl;
  }

  clearCache(includePersistent: boolean = false): void {
    // Clear memory cache
    this.mediaCache.clear();
    this.loadingMedia.clear();
    this.cacheSize = 0;

    if (includePersistent) {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(this.CACHE_PREFIX));
      keys.forEach(key => {
        this.cacheService.removeItem(key, true);
      });
    }

    this.logService.log(LevelLogEnum.INFO, 'MediaCacheService', 'Media cache cleared', { includePersistent });
  }

  getCacheStats(): { size: number; items: number; persistentItems: number } {
    const persistentKeys = Object.keys(localStorage).filter(key => key.startsWith(this.CACHE_PREFIX));
    
    return {
      size: this.cacheSize,
      items: this.mediaCache.size,
      persistentItems: persistentKeys.length
    };
  }

  private loadFromNetwork(url: string, cacheKey: string, options: MediaCacheOptions): Observable<string> {
    const loadingSubject = new BehaviorSubject<boolean>(true);
    this.loadingMedia.set(cacheKey, loadingSubject);

    return this.http.get(url, { responseType: 'blob' }).pipe(
      timeout(options.timeout || 30000),
      map(blob => {
        // Validate downloaded blob
        if (!blob || blob.size === 0) {
          throw new Error('Invalid blob received from network');
        }

        const cachedMedia: CachedMedia = {
          url,
          blob,
          type: blob.type,
          size: blob.size,
          timestamp: Date.now(),
          quality: options.quality || 'medium'
        };

        if (this.cacheSize + blob.size > this.MAX_CACHE_SIZE) {
          this.cleanupCache();
        }

        this.mediaCache.set(cacheKey, cachedMedia);
        this.cacheSize += blob.size;

        if (options.persistent) {
          // Save to persistent cache asynchronously
          this.saveToPersistentCache(cacheKey, cachedMedia).catch(error => {
            this.logService.log(LevelLogEnum.ERROR, 'MediaCacheService', 'Failed to save to persistent cache', { error });
          });
        }

        loadingSubject.next(false);
        this.loadingMedia.delete(cacheKey);

        this.logService.log(LevelLogEnum.INFO, 'MediaCacheService', 'Media loaded from network and cached', { 
          url, 
          size: blob.size, 
          quality: options.quality || 'medium'
        });

        const objectURL = this.createObjectURL(blob);
        if (!objectURL) {
          throw new Error('Failed to create object URL for loaded media');
        }
        return objectURL;
      }),
      catchError((error: HttpErrorResponse) => {
        loadingSubject.next(false);
        this.loadingMedia.delete(cacheKey);

        this.logService.log(LevelLogEnum.ERROR, 'MediaCacheService', 'Failed to load media from network', { 
          url, 
          error: error.message,
          status: error.status 
        });

        return of(url);
      })
    );
  }

  private generateCacheKey(url: string, quality: string): string {
    return `${this.CACHE_PREFIX}${btoa(url)}_${quality}`;
  }

  private isCacheValid(cached: CachedMedia): boolean {
    const maxAge = 24 * 60 * 60 * 1000;
    return Date.now() - cached.timestamp < maxAge;
  }

  private removeFromCache(cacheKey: string): void {
    const cached = this.mediaCache.get(cacheKey);
    if (cached) {
      this.cacheSize -= cached.size;
      this.mediaCache.delete(cacheKey);
    }
  }

  private cleanupCache(): void {
    const entries = Array.from(this.mediaCache.entries());
    const sortedEntries = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = Math.ceil(sortedEntries.length * 0.2);
    sortedEntries.slice(0, toRemove).forEach(([key, cached]) => {
      this.removeFromCache(key);
      this.cacheService.removeItem(key, true);
    });

    this.logService.log(LevelLogEnum.INFO, 'MediaCacheService', 'Cache cleanup completed', { 
      removedItems: toRemove,
      remainingSize: this.cacheSize 
    });
  }

  private initializeCache(): void {
    const keys = Object.keys(localStorage).filter(key => key.startsWith(this.CACHE_PREFIX));
    keys.forEach(key => {
      const cached = this.getFromPersistentCache(key);
      if (cached && this.isCacheValid(cached)) {
        this.mediaCache.set(key, cached);
        this.cacheSize += cached.size;
      } else {
        this.cacheService.removeItem(key, true);
      }
    });

    this.logService.log(LevelLogEnum.INFO, 'MediaCacheService', 'Media cache initialized', { 
      items: this.mediaCache.size,
      size: this.cacheSize 
    });
  }

  // Convert blob to base64 string
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!blob || blob.size === 0) {
        reject(new Error('Invalid blob provided for base64 conversion'));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const result = reader.result as string;
          // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
          const base64 = result.split(',')[1];
          if (!base64) {
            reject(new Error('Failed to extract base64 data from blob'));
            return;
          }
          resolve(base64);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => {
        reject(new Error(`FileReader error: ${error}`));
      };
      reader.readAsDataURL(blob);
    });
  }

  // Convert base64 string back to blob
  private base64ToBlob(base64: string, type: string): Blob {
    try {
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      return new Blob([byteArray], { type });
    } catch (error) {
      this.logService.log(LevelLogEnum.ERROR, 'MediaCacheService', 'Failed to convert base64 to blob', { 
        error: error instanceof Error ? error.message : String(error),
        base64Length: base64?.length,
        type
      });
      throw error;
    }
  }

  // Safely create object URL from blob
  private createObjectURL(blob: Blob): string | null {
    try {
      if (blob && blob.size > 0) {
        return URL.createObjectURL(blob);
      }
      return null;
    } catch (error) {
      this.logService.log(LevelLogEnum.ERROR, 'MediaCacheService', 'Failed to create object URL', { 
        error: error instanceof Error ? error.message : String(error),
        blobSize: blob?.size,
        blobType: blob?.type
      });
      return null;
    }
  }

  // Save to persistent cache with blob serialization
  private async saveToPersistentCache(cacheKey: string, cachedMedia: CachedMedia): Promise<void> {
    try {
      // Validate blob before conversion
      if (!cachedMedia.blob || cachedMedia.blob.size === 0) {
        throw new Error('Invalid blob for persistent cache');
      }

      const blobData = await this.blobToBase64(cachedMedia.blob);
      const serializableData: SerializableCachedMedia = {
        url: cachedMedia.url,
        blobData,
        type: cachedMedia.type,
        size: cachedMedia.size,
        timestamp: cachedMedia.timestamp,
        quality: cachedMedia.quality
      };
      
      this.cacheService.setItem(cacheKey, serializableData, 24 * 60 * 60 * 1000, true);
    } catch (error) {
      this.logService.log(LevelLogEnum.ERROR, 'MediaCacheService', 'Failed to save media to persistent cache', { 
        cacheKey, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  // Get from persistent cache with blob deserialization
  private getFromPersistentCache(cacheKey: string): CachedMedia | null {
    try {
      const serializableData = this.cacheService.getItem<SerializableCachedMedia>(cacheKey, true);
      
      if (!serializableData || !serializableData.blobData) {
        return null;
      }

      let blob: Blob;
      try {
        blob = this.base64ToBlob(serializableData.blobData, serializableData.type);
      } catch (blobError) {
        this.logService.log(LevelLogEnum.ERROR, 'MediaCacheService', 'Failed to convert base64 to blob', { 
          cacheKey, 
          error: blobError instanceof Error ? blobError.message : String(blobError) 
        });
        this.cacheService.removeItem(cacheKey, true);
        return null;
      }
      
      // Validate blob
      if (!blob || blob.size === 0) {
        this.logService.log(LevelLogEnum.WARN, 'MediaCacheService', 'Invalid blob in cache', { cacheKey });
        this.cacheService.removeItem(cacheKey, true);
        return null;
      }
      
      return {
        url: serializableData.url,
        blob,
        type: serializableData.type,
        size: serializableData.size,
        timestamp: serializableData.timestamp,
        quality: serializableData.quality
      };
    } catch (error) {
      this.logService.log(LevelLogEnum.ERROR, 'MediaCacheService', 'Failed to load media from persistent cache', { 
        cacheKey, 
        error: error instanceof Error ? error.message : String(error) 
      });
      // Remove corrupted cache entry
      this.cacheService.removeItem(cacheKey, true);
      return null;
    }
  }
} 