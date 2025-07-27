import { Injectable } from '@angular/core';
import { LogService, LevelLogEnum } from './core-apis/log.service';

@Injectable({
  providedIn: 'root'
})
export class SafariIOSDebugService {
  private isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  private isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

  constructor(private logService: LogService) {
    // Expose this service globally for console access
    if (typeof window !== 'undefined') {
      (window as any).safariIOSDebug = this;
    }
  }

  /**
   * Get current environment information
   */
  getEnvironmentInfo(): any {
    const info = {
      isIOS: this.isIOS,
      isSafari: this.isSafari,
      isSafariIOS: this.isSafariIOS(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      language: navigator.language,
      languages: navigator.languages,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: (navigator as any).deviceMemory,
      maxTouchPoints: navigator.maxTouchPoints
    };

    // Safari iOS Environment Info - no need to log every environment check
    return info;
  }

  /**
   * Check IndexedDB support and status
   */
  async checkIndexedDBSupport(): Promise<any> {
    const support = {
      indexedDBAvailable: 'indexedDB' in window,
      databases: [] as string[],
      testResult: null as any
    };

    if (support.indexedDBAvailable) {
      try {
        // Try to get list of databases
        if ('databases' in indexedDB && typeof indexedDB.databases === 'function') {
          const databases = await indexedDB.databases();
          support.databases = databases
            .map(db => db.name)
            .filter((name): name is string => !!name);
        }

        // Test IndexedDB functionality
        support.testResult = await this.testIndexedDB();
      } catch (error) {
        support.testResult = { error: error instanceof Error ? error.message : String(error) };
      }
    }

    // IndexedDB Support Check - no need to log every support check
    return support;
  }

  /**
   * Test IndexedDB functionality
   */
  private async testIndexedDB(): Promise<any> {
    return new Promise((resolve) => {
      const testDBName = 'test-safari-ios-' + Date.now();
      const request = indexedDB.open(testDBName, 1);

      request.onerror = () => {
        resolve({ success: false, error: request.error?.message || 'Unknown error' });
      };

      request.onsuccess = () => {
        const db = request.result;
        db.close();
        
        // Clean up test database
        const deleteRequest = indexedDB.deleteDatabase(testDBName);
        deleteRequest.onsuccess = () => {
          resolve({ success: true, message: 'IndexedDB test successful' });
        };
        deleteRequest.onerror = () => {
          resolve({ success: true, warning: 'Test successful but cleanup failed' });
        };
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        try {
          const store = db.createObjectStore('test', { keyPath: 'id' });
          resolve({ success: true, message: 'IndexedDB test successful' });
        } catch (error) {
          resolve({ success: false, error: error instanceof Error ? error.message : String(error) });
        }
      };
    });
  }

  /**
   * Clear all Worky-related data
   */
  async clearAllWorkyData(): Promise<any> {
    const results = {
      localStorage: this.clearLocalStorage(),
      sessionStorage: this.clearSessionStorage(),
      indexedDB: await this.clearIndexedDB(),
      cache: this.clearCache()
    };

    // Worky Data Cleanup Results - no need to log every cleanup
    return results;
  }

  /**
   * Clear localStorage
   */
  private clearLocalStorage(): any {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('worky') || key.startsWith('Worky') || key.includes('cache'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    return {
      cleared: keysToRemove.length,
      keys: keysToRemove
    };
  }

  /**
   * Clear sessionStorage
   */
  private clearSessionStorage(): any {
    const beforeCount = sessionStorage.length;
    sessionStorage.clear();
    
    return {
      cleared: beforeCount,
      remaining: sessionStorage.length
    };
  }

  /**
   * Clear IndexedDB
   */
  private async clearIndexedDB(): Promise<any> {
    const databases = ['MobileImageCacheDB', 'WorkyMessagesDB', 'WorkyPublicationsDB'];
    const results = [];

    for (const dbName of databases) {
      try {
        await this.deleteDatabase(dbName);
        results.push({ name: dbName, success: true });
      } catch (error) {
        results.push({ name: dbName, success: false, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return results;
  }

  /**
   * Delete a specific database
   */
  private async deleteDatabase(dbName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(dbName);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Database deletion blocked'));
    });
  }

  /**
   * Clear browser cache
   */
  private clearCache(): any {
    // This is a best-effort approach
    // Browser cache clearing is limited by security restrictions
    return {
      message: 'Cache clearing attempted (limited by browser security)',
      note: 'You may need to manually clear browser cache in Safari settings'
    };
  }

  /**
   * Force reload the application
   */
  forceReload(): void {
    // Force reloading application - no need to log every reload
    window.location.reload();
  }

  /**
   * Get memory usage information (if available)
   */
  getMemoryInfo(): any {
    const info: any = {};

    if ('memory' in performance) {
      const memory = (performance as any).memory;
      info.usedJSHeapSize = memory.usedJSHeapSize;
      info.totalJSHeapSize = memory.totalJSHeapSize;
      info.jsHeapSizeLimit = memory.jsHeapSizeLimit;
      info.usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit * 100).toFixed(2) + '%';
    } else {
      info.message = 'Memory information not available';
    }

    // Memory Info - no need to log every memory check
    return info;
  }

  /**
   * Check if we're in private browsing mode
   */
  async checkPrivateBrowsing(): Promise<any> {
    const checks = {
      localStorage: false,
      sessionStorage: false,
      indexedDB: false,
      cookies: false
    };

    try {
      // Test localStorage
      const testKey = '__test_private_browsing__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      checks.localStorage = true;
    } catch (error) {
      checks.localStorage = false;
    }

    try {
      // Test sessionStorage
      sessionStorage.setItem('test', 'test');
      sessionStorage.removeItem('test');
      checks.sessionStorage = true;
    } catch (error) {
      checks.sessionStorage = false;
    }

    try {
      // Test IndexedDB
      const testRequest = indexedDB.open('test', 1);
      await new Promise((resolve, reject) => {
        testRequest.onerror = () => reject(testRequest.error);
        testRequest.onsuccess = () => {
          indexedDB.deleteDatabase('test');
          resolve(true);
        };
      });
      checks.indexedDB = true;
    } catch (error) {
      checks.indexedDB = false;
    }

    try {
      // Test cookies
      document.cookie = 'test=1; path=/';
      document.cookie = 'test=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      checks.cookies = true;
    } catch (error) {
      checks.cookies = false;
    }

    const isPrivateBrowsing = !checks.localStorage || !checks.indexedDB;
    
    // Private Browsing Check - no need to log every check

    return { ...checks, isPrivateBrowsing };
  }

  /**
   * Get all available information for debugging
   */
  async getFullDebugInfo(): Promise<any> {
    const debugInfo = {
      environment: this.getEnvironmentInfo(),
      indexedDB: await this.checkIndexedDBSupport(),
      memory: this.getMemoryInfo(),
      privateBrowsing: await this.checkPrivateBrowsing(),
      timestamp: new Date().toISOString()
    };

    // Full Safari iOS Debug Info - no need to log every debug info
    return debugInfo;
  }

  private isSafariIOS(): boolean {
    return this.isIOS && this.isSafari;
  }
} 