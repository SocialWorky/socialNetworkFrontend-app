import { Injectable } from '@angular/core';
import { LogService, LevelLogEnum } from './core-apis/log.service';

interface CacheItem<T> {
  value: T;
  timestamp: number;
  version?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private cache = new Map<string, CacheItem<any>>();
  private readonly DEFAULT_DURATION = 30000;
  private readonly CACHE_VERSION = '1.0.0';

  constructor(private logService: LogService) {}

  setItem<T>(key: string, value: T, duration: number = this.DEFAULT_DURATION, persistent: boolean = false): void {
    const cacheItem: CacheItem<T> = {
      value,
      timestamp: Date.now() + duration,
      version: this.CACHE_VERSION
    };

    this.cache.set(key, cacheItem);

    if (persistent) {
      try {
        localStorage.setItem(`cache_${key}`, JSON.stringify(cacheItem));
      } catch (error) {
        // Cache storage limit exceeded, removing oldest items - no need to log every cleanup
        this.cleanupPersistentCache();
      }
    }
  }

  getItem<T>(key: string, persistent: boolean = false): T | null {
    let item = this.cache.get(key);
    
    if (!item && persistent) {
      const stored = localStorage.getItem(`cache_${key}`);
      if (stored) {
        try {
          const parsedItem = JSON.parse(stored);
          if (parsedItem && typeof parsedItem === 'object' && parsedItem.value !== undefined) {
            item = parsedItem as CacheItem<any>;
            this.cache.set(key, item);
          } else {
            localStorage.removeItem(`cache_${key}`);
            return null;
          }
        } catch (error) {
          this.logService.log(
            LevelLogEnum.ERROR,
            'CacheService',
            'Failed to parse cached item',
            { key, error: error instanceof Error ? error.message : String(error) }
          );
          localStorage.removeItem(`cache_${key}`);
          return null;
        }
      }
    }
    
    if (!item) {
      return null;
    }

    if (item.version !== this.CACHE_VERSION) {
      this.removeItem(key, persistent);
      return null;
    }

    if (Date.now() > item.timestamp) {
      this.removeItem(key, persistent);
      return null;
    }

    return item.value as T;
  }

  removeItem(key: string, persistent: boolean = false): void {
    this.cache.delete(key);
    if (persistent) {
      localStorage.removeItem(`cache_${key}`);
    }
  }

  clear(persistent: boolean = false): void {
    this.cache.clear();
    if (persistent) {
      this.clearPersistentCache();
    }
  }

  private cleanupPersistentCache(): void {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('cache_'));
    if (keys.length > 100) {
      const oldestKeys = keys.slice(0, 20);
      oldestKeys.forEach(key => localStorage.removeItem(key));
    }
  }

  private clearPersistentCache(): void {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('cache_'));
    keys.forEach(key => localStorage.removeItem(key));
  }

  cacheUserProfile(userId: string, profile: any): void {
    this.setItem(`user_profile_${userId}`, profile, 24 * 60 * 60 * 1000, true);
  }

  cachePublications(page: number, publications: any[]): void {
    this.setItem(`publications_page_${page}`, publications, 15 * 60 * 1000, true);
  }

  cacheNotifications(notifications: any[]): void {
    this.setItem('notifications', notifications, 5 * 60 * 1000, false);
  }
}
