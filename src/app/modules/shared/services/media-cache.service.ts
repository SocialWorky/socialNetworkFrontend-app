import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, timeout, retryWhen, delay, switchMap } from 'rxjs/operators';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
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

export interface SerializableCachedMedia {
  url: string;
  blobData: string;
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
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // Reduced from 100MB to 50MB
  private readonly DEFAULT_OPTIONS: MediaCacheOptions = {
    quality: 'medium',
    maxRetries: 2, // Reduced from 3 to 2
    retryDelay: 3000, // Increased from 2000 to 3000
    timeout: 20000, // Reduced from 30000 to 20000
    persistent: false, // Disabled persistent cache by default
    preload: false
  };

  private mediaCache = new Map<string, CachedMedia>();
  private loadingMedia = new Map<string, BehaviorSubject<boolean>>();
  private cacheSize = 0;
  
  // NEW: Load control to prevent infinite loading
  private currentLoads = 0;
  private maxConcurrentLoads = 2; // Maximum 2 concurrent video loads
  private loadHistory: number[] = []; // Track load times
  private maxLoadsPerMinute = 5; // Maximum 5 video loads per minute

  constructor(
    private http: HttpClient,
    private cacheService: CacheService,
    private logService: LogService
  ) {
    this.initializeCache();
    this.startLoadHistoryCleanup();
  }

  private initializeCache(): void {
    // Initialize cache with cleanup
    this.cleanupCache();
  }

  /**
   * NEW: Start cleanup of load history every minute
   */
  private startLoadHistoryCleanup(): void {
    setInterval(() => {
      const oneMinuteAgo = Date.now() - 60000;
      this.loadHistory = this.loadHistory.filter(time => time > oneMinuteAgo);
    }, 60000); // Every minute
  }

  /**
   * NEW: Check if we can load more based on rate limiting
   */
  private canLoadMore(): boolean {
    const oneMinuteAgo = Date.now() - 60000;
    const recentLoads = this.loadHistory.filter(time => time > oneMinuteAgo).length;
    
    return recentLoads < this.maxLoadsPerMinute && this.currentLoads < this.maxConcurrentLoads;
  }

  /**
   * NEW: Record a load attempt
   */
  private recordLoad(): void {
    this.loadHistory.push(Date.now());
    this.currentLoads++;
    
    // Auto-decrease after delay
    setTimeout(() => {
      this.currentLoads = Math.max(0, this.currentLoads - 1);
    }, 5000); // 5 seconds delay
  }

  loadMedia(url: string, options: MediaCacheOptions = {}): Observable<string> {
    const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };
    const cacheKey = this.generateCacheKey(url, finalOptions.quality || 'medium');

    // NEW: Check if we can load more
    if (!this.canLoadMore()) {
      this.logService.log(LevelLogEnum.WARN, 'MediaCacheService', 'Video load blocked due to rate limiting', {
        url,
        currentLoads: this.currentLoads,
        recentLoads: this.loadHistory.length,
        maxConcurrent: this.maxConcurrentLoads,
        maxPerMinute: this.maxLoadsPerMinute
      });
      return throwError(() => new Error('Too many video loads'));
    }

    if (this.mediaCache.has(cacheKey)) {
      const cached = this.mediaCache.get(cacheKey)!;
      if (this.isCacheValid(cached)) {
        // Validate blob before creating URL
        const objectURL = this.createObjectURL(cached.blob);
        if (objectURL) {
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
    const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };
    
    urls.forEach(url => {
      this.loadMedia(url, finalOptions).subscribe({
        next: () => {
          // Media preloaded successfully - no need to log
        },
        error: (error) => {
          // Don't log every preload error to reduce noise
        }
      });
    });
  }

  // Get optimized URL based on quality
  getOptimizedUrl(url: string, quality: 'slow' | 'medium' | 'fast' = 'medium'): string {
    // For now, return the original URL
    // This can be enhanced to return different quality URLs
    return url;
  }

  private loadFromNetwork(url: string, cacheKey: string, options: MediaCacheOptions): Observable<string> {
    const loadingSubject = new BehaviorSubject<boolean>(true);
    this.loadingMedia.set(cacheKey, loadingSubject);

    // NEW: Record load attempt
    this.recordLoad();

    return this.http.get(url, { responseType: 'blob' }).pipe(
      timeout(options.timeout || 20000), // Reduced timeout
      map(blob => {
        // Validate downloaded blob
        if (!blob || blob.size === 0) {
          throw new Error('Invalid blob received from network');
        }

        // NEW: Check if blob is too large (prevent memory issues)
        const maxBlobSize = 50 * 1024 * 1024; // 50MB max
        if (blob.size > maxBlobSize) {
          this.logService.log(LevelLogEnum.WARN, 'MediaCacheService', 'Video too large, skipping cache', {
            url,
            size: blob.size,
            maxSize: maxBlobSize
          });
          
          // Return URL directly without caching
          const objectURL = this.createObjectURL(blob);
          if (!objectURL) {
            throw new Error('Failed to create object URL for large video');
          }
          
          loadingSubject.next(false);
          this.loadingMedia.delete(cacheKey);
          return objectURL;
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
    return `${this.CACHE_PREFIX}${quality}_${this.hashString(url)}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private isCacheValid(cachedMedia: CachedMedia): boolean {
    const maxAge = 30 * 60 * 1000; // 30 minutes (reduced from longer periods)
    return Date.now() - cachedMedia.timestamp < maxAge;
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
    
    // Remove oldest entries until cache size is acceptable
    while (this.cacheSize > this.MAX_CACHE_SIZE * 0.8 && sortedEntries.length > 0) {
      const [key, value] = sortedEntries.shift()!;
      this.mediaCache.delete(key);
      this.cacheSize -= value.size;
    }
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
      
      this.cacheService.setItem(cacheKey, serializableData, 30 * 60 * 1000, true); // 30 minutes
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

  // NEW: Get load statistics
  getLoadStats(): any {
    const oneMinuteAgo = Date.now() - 60000;
    const recentLoads = this.loadHistory.filter(time => time > oneMinuteAgo).length;
    
    return {
      currentLoads: this.currentLoads,
      maxConcurrentLoads: this.maxConcurrentLoads,
      recentLoads: recentLoads,
      maxLoadsPerMinute: this.maxLoadsPerMinute,
      loadHistoryLength: this.loadHistory.length,
      canLoadMore: this.canLoadMore(),
      cacheSize: this.cacheSize,
      maxCacheSize: this.MAX_CACHE_SIZE,
      mediaCacheSize: this.mediaCache.size
    };
  }

  // NEW: Force cleanup
  forceCleanup(): void {
    this.currentLoads = 0;
    this.loadHistory = [];
    this.mediaCache.clear();
    this.cacheSize = 0;
    this.loadingMedia.clear();
    this.logService.log(LevelLogEnum.INFO, 'MediaCacheService', 'Forced cleanup completed');
  }
} 