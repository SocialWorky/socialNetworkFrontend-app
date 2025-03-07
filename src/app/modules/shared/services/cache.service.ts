import { Injectable } from '@angular/core';

interface CacheItem<T> {
  value: T;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private cache = new Map<string, CacheItem<any>>();
  private readonly DEFAULT_DURATION = 30000; // 30 seconds

  setItem<T>(key: string, value: T, duration: number = this.DEFAULT_DURATION): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now() + duration
    });
  }

  getItem<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    if (Date.now() > item.timestamp) {
      this.removeItem(key);
      return null;
    }

    return item.value as T;
  }

  removeItem(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}
