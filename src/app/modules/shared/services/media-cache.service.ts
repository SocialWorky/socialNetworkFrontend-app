import { Injectable } from '@angular/core';
import { Observable, of, from, throwError, BehaviorSubject } from 'rxjs';
import { catchError, map, switchMap, tap, timeout } from 'rxjs/operators';
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
        this.logService.log(LevelLogEnum.INFO, 'MediaCacheService', 'Media loaded from memory cache', { url, quality: finalOptions.quality || 'medium' });
        return of(URL.createObjectURL(cached.blob));
      } else {
        this.removeFromCache(cacheKey);
      }
    }

    const cachedData = this.cacheService.getItem<CachedMedia>(cacheKey, true);
    if (cachedData && this.isCacheValid(cachedData)) {
      this.mediaCache.set(cacheKey, cachedData);
      this.cacheSize += cachedData.size;
      this.logService.log(LevelLogEnum.INFO, 'MediaCacheService', 'Media loaded from persistent cache', { url, quality: finalOptions.quality || 'medium' });
      return of(URL.createObjectURL(cachedData.blob));
    }

    if (this.loadingMedia.has(cacheKey)) {
      return this.loadingMedia.get(cacheKey)!.asObservable().pipe(
        switchMap(() => {
          const cached = this.mediaCache.get(cacheKey);
          return cached ? of(URL.createObjectURL(cached.blob)) : throwError(() => new Error('Media loading failed'));
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
    
    if (originalUrl.includes(environment.APIFILESERVICE)) {
      const separator = originalUrl.includes('?') ? '&' : '?';
      return `${originalUrl}${separator}quality=${quality}`;
    }

    return originalUrl;
  }

  clearCache(includePersistent: boolean = false): void {
    this.mediaCache.forEach(cached => {
      URL.revokeObjectURL(URL.createObjectURL(cached.blob));
    });

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
          this.cacheService.setItem(cacheKey, cachedMedia, 24 * 60 * 60 * 1000, true);
        }

        loadingSubject.next(false);
        this.loadingMedia.delete(cacheKey);

        this.logService.log(LevelLogEnum.INFO, 'MediaCacheService', 'Media loaded from network and cached', { 
          url, 
          size: blob.size, 
          quality: options.quality || 'medium'
        });

        return URL.createObjectURL(blob);
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
      const cached = this.cacheService.getItem<CachedMedia>(key, true);
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
} 