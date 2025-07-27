import { Injectable } from '@angular/core';
import { LogService, LevelLogEnum } from './core-apis/log.service';

@Injectable({
  providedIn: 'root'
})
export class SafariIOSErrorHandlerService {
  private isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  private isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
  
  private isPrivateBrowsing = false;
  private hasIndexedDBSupport = false;

  constructor(private logService: LogService) {
    this.initializeErrorHandler();
  }

  private async initializeErrorHandler(): Promise<void> {
    if (this.isIOS && this.isSafari) {
      // iOS Safari detected, initializing error handler - no need to log every initialization
      
      // Check IndexedDB support
      this.hasIndexedDBSupport = await this.checkIndexedDBSupport();
      
      // Check private browsing mode
      this.isPrivateBrowsing = await this.checkPrivateBrowsing();
      
      // Setup error listeners
      this.setupErrorListeners();
      
      // Error handler initialized - no need to log every initialization
    }
  }

  private async checkIndexedDBSupport(): Promise<boolean> {
    if (!('indexedDB' in window)) {
      return false;
    }

    return new Promise((resolve) => {
      try {
        const testRequest = indexedDB.open('test', 1);
        testRequest.onerror = () => {
          resolve(false);
        };
        testRequest.onsuccess = () => {
          indexedDB.deleteDatabase('test');
          resolve(true);
        };
      } catch (error) {
        resolve(false);
      }
    });
  }

  private async checkPrivateBrowsing(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // Try to access localStorage
        const testKey = '__test_private_browsing__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        
        // Try IndexedDB
        const testRequest = indexedDB.open('test', 1);
        testRequest.onerror = () => {
          resolve(true); // Likely private browsing
        };
        testRequest.onsuccess = () => {
          indexedDB.deleteDatabase('test');
          resolve(false); // Not private browsing
        };
      } catch (error) {
        resolve(true); // Error suggests private browsing
      }
    });
  }

  private setupErrorListeners(): void {
    // Listen for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleUnhandledRejection(event);
    });

    // Listen for global errors
    window.addEventListener('error', (event) => {
      this.handleGlobalError(event);
    });
  }

  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    const error = event.reason;
    
    // Check for IndexedDB/Blob related errors
    if (this.isIndexedDBError(error)) {
      this.logService.log(LevelLogEnum.WARN, 'SafariIOSErrorHandlerService', 'IndexedDB error detected, providing fallback', { error: error.message });
      event.preventDefault(); // Prevent the error from being logged to console
      this.handleIndexedDBError(error);
    }
    
    // Check for network/404 errors
    if (this.isNetworkError(error)) {
      this.logService.log(LevelLogEnum.WARN, 'SafariIOSErrorHandlerService', 'Network error detected', { error: error.message });
      event.preventDefault();
      this.handleNetworkError(error);
    }
  }

  private handleGlobalError(event: ErrorEvent): void {
    const error = event.error;
    
    // Check for IndexedDB/Blob related errors
    if (this.isIndexedDBError(error)) {
      this.logService.log(LevelLogEnum.WARN, 'SafariIOSErrorHandlerService', 'IndexedDB error detected in global error handler', { error: error?.message });
      event.preventDefault();
      this.handleIndexedDBError(error);
    }
  }

  private isIndexedDBError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message || error.toString();
    return errorMessage.includes('IndexedDB') || 
           errorMessage.includes('Blob') || 
           errorMessage.includes('File') ||
           errorMessage.includes('object store') ||
           error.name === 'UnknownError';
  }

  private isNetworkError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message || error.toString();
    return errorMessage.includes('404') || 
           errorMessage.includes('Failed to fetch') ||
           errorMessage.includes('NetworkError');
  }

  private handleIndexedDBError(error: any): void {
    // Provide fallback behavior for IndexedDB errors
    // Providing IndexedDB fallback behavior - no need to log every fallback
    
    // Clear any corrupted IndexedDB data
    this.clearCorruptedIndexedDB();
    
    // Notify other services about IndexedDB issues
    this.notifyIndexedDBIssues();
  }

  private handleNetworkError(error: any): void {
    // Handle network errors, especially 404s
    // Handling network error - no need to log every network error
    
    // For 404 errors on images, we could implement retry logic or fallback images
    if (error.message?.includes('404')) {
      this.handle404Error(error);
    }
  }

  private async clearCorruptedIndexedDB(): Promise<void> {
    if (!this.hasIndexedDBSupport) return;

    try {
      // Clear all Worky-related databases
      const databases = ['MobileImageCacheDB', 'WorkyMessagesDB', 'WorkyPublicationsDB'];
      
      for (const dbName of databases) {
        try {
          await this.deleteDatabase(dbName);
          // Cleared corrupted database - no need to log every database clear
        } catch (error) {
          this.logService.log(LevelLogEnum.WARN, 'SafariIOSErrorHandlerService', 'Failed to clear database', { dbName, error });
        }
      }
    } catch (error) {
      this.logService.log(LevelLogEnum.ERROR, 'SafariIOSErrorHandlerService', 'Error clearing corrupted IndexedDB', { error });
    }
  }

  private deleteDatabase(dbName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(dbName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private notifyIndexedDBIssues(): void {
    // Dispatch a custom event that other services can listen to
    const event = new CustomEvent('indexeddb-issues', {
      detail: {
        isPrivateBrowsing: this.isPrivateBrowsing,
        hasIndexedDBSupport: this.hasIndexedDBSupport,
        timestamp: Date.now()
      }
    });
    window.dispatchEvent(event);
  }

  private handle404Error(error: any): void {
    // For 404 errors on images, we could implement retry logic
    this.logService.log(LevelLogEnum.WARN, 'SafariIOSErrorHandlerService', '404 error detected, consider implementing retry logic', { error: error.message });
  }

  // Public methods for other services to use
  public isSafariIOS(): boolean {
    return this.isIOS && this.isSafari;
  }

  public isPrivateBrowsingMode(): boolean {
    return this.isPrivateBrowsing;
  }

  public hasIndexedDB(): boolean {
    return this.hasIndexedDBSupport;
  }

  public getErrorHandlingStatus(): {
    isSafariIOS: boolean;
    isPrivateBrowsing: boolean;
    hasIndexedDB: boolean;
  } {
    return {
      isSafariIOS: this.isSafariIOS(),
      isPrivateBrowsing: this.isPrivateBrowsingMode(),
      hasIndexedDB: this.hasIndexedDB()
    };
  }
} 