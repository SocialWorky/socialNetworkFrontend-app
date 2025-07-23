import { Injectable } from '@angular/core';
import { CacheService } from './cache.service';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root'
})
export class DevCacheService {
  private isDev = !environment.PRODUCTION;
  private cacheDebug = environment.CACHE_DEBUG === 'true';

  constructor(private cacheService: CacheService) {
    if (this.isDev) {
      this.setupDevTools();
    }
  }

  private setupDevTools(): void {
    if (typeof window !== 'undefined') {
      (window as any).devCache = {
        clear: () => this.cacheService.clear(true),
        stats: () => this.getCacheStats(),
        inspect: (key: string) => this.inspectCache(key),
        mockData: () => this.generateMockData()
      };
    }
  }

  private getCacheStats(): any {
    const localStorageKeys = Object.keys(localStorage).filter(key => key.startsWith('cache_'));
    const memoryKeys = Array.from(this.cacheService['cache'].keys());
    
    return {
      localStorage: localStorageKeys.length,
      memory: memoryKeys.length,
      total: localStorageKeys.length + memoryKeys.length
    };
  }

  private inspectCache(key: string): any {
    const memoryItem = this.cacheService['cache'].get(key);
    const localStorageItem = localStorage.getItem(`cache_${key}`);
    
    return {
      memory: memoryItem,
      localStorage: localStorageItem ? JSON.parse(localStorageItem) : null
    };
  }

  generateMockData(): void {
    // Mock data para desarrollo
    this.cacheService.cacheUserProfile('dev-user-1', {
      id: 'dev-user-1',
      name: 'Developer User',
      email: 'dev@example.com',
      avatar: 'https://via.placeholder.com/150'
    });

    this.cacheService.cachePublications(1, [
      {
        id: 'post-1',
        content: 'Mock publication for development',
        author: 'dev-user-1',
        timestamp: new Date().toISOString()
      }
    ]);
  }

  logCacheOperation(operation: string, key: string, data?: any): void {
    if (this.cacheDebug) {
      console.group(`🔧 Cache ${operation}`);
      console.log('Key:', key);
      if (data) console.log('Data:', data);
      console.log('Timestamp:', new Date().toISOString());
      console.groupEnd();
    }
  }
} 