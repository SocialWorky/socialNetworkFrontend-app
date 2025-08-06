import { Injectable, ErrorHandler, NgZone } from '@angular/core';
import { LogService, LevelLogEnum } from './core-apis/log.service';

@Injectable()
export class GlobalErrorHandlerService implements ErrorHandler {
  private isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  private isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

  constructor(
    private logService: LogService,
    private ngZone: NgZone
  ) {}

  handleError(error: Error | any): void {
    // Check if this is a Safari iOS specific error
    if (this.isSafariIOS() && this.isIndexedDBError(error)) {
      this.handleSafariIOSIndexedDBError(error);
      return;
    }

    // Check if this is a network error on Safari iOS
    if (this.isSafariIOS() && this.isNetworkError(error)) {
      this.handleSafariIOSNetworkError(error);
      return;
    }

    // For other errors, log them normally
    this.logService.log(LevelLogEnum.ERROR, 'GlobalErrorHandlerService', 'Unhandled error', {
      error: error.message,
      stack: error.stack,
      isSafariIOS: this.isSafariIOS()
    });

    // In development, still show the error in console
    if (typeof console !== 'undefined' && console.error) {
      console.error('Global error handler caught:', error);
    }
  }

  private isSafariIOS(): boolean {
    return this.isIOS && this.isSafari;
  }

  private isIndexedDBError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message || error.toString();
    const errorName = error.name || '';
    
    return errorMessage.includes('IndexedDB') || 
           errorMessage.includes('Blob') || 
           errorMessage.includes('File') ||
           errorMessage.includes('object store') ||
           errorName === 'UnknownError' ||
           (errorMessage.includes('UnknownError') && errorMessage.includes('Blob')) ||
           (errorMessage.includes('UnknownError') && errorMessage.includes('File')) ||
           (errorMessage.includes('UnknownError') && errorMessage.includes('object store'));
  }

  private isNetworkError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message || error.toString();
    return errorMessage.includes('404') || 
           errorMessage.includes('Failed to fetch') ||
           errorMessage.includes('NetworkError') ||
           errorMessage.includes('ERR_NETWORK') ||
           errorMessage.includes('ERR_INTERNET_DISCONNECTED');
  }

  private handleSafariIOSIndexedDBError(error: any): void {
    this.ngZone.run(() => {
      this.logService.log(LevelLogEnum.WARN, 'GlobalErrorHandlerService', 'Safari iOS IndexedDB error handled', {
        error: error.message,
        isSafariIOS: true
      });

      // Don't log this error to console to avoid spam
      // The error is expected behavior in Safari iOS
      
      // Optionally, we could dispatch a custom event for other services to listen to
      const event = new CustomEvent('safari-ios-indexeddb-error', {
        detail: {
          error: error.message,
          timestamp: Date.now()
        }
      });
      window.dispatchEvent(event);
    });
  }

  private handleSafariIOSNetworkError(error: any): void {
    this.ngZone.run(() => {
      this.logService.log(LevelLogEnum.WARN, 'GlobalErrorHandlerService', 'Safari iOS network error handled', {
        error: error.message,
        isSafariIOS: true
      });

      // For network errors, we might want to show a user-friendly message
      // or implement retry logic
      
      // Dispatch event for other services to handle
      const event = new CustomEvent('safari-ios-network-error', {
        detail: {
          error: error.message,
          timestamp: Date.now()
        }
      });
      window.dispatchEvent(event);
    });
  }

  /**
   * Check if the current environment is Safari iOS
   */
  public isSafariIOSEnvironment(): boolean {
    return this.isSafariIOS();
  }

  /**
   * Get detailed environment information
   */
  public getEnvironmentInfo(): {
    isIOS: boolean;
    isSafari: boolean;
    isSafariIOS: boolean;
    userAgent: string;
    platform: string;
  } {
    return {
      isIOS: this.isIOS,
      isSafari: this.isSafari,
      isSafariIOS: this.isSafariIOS(),
      userAgent: navigator.userAgent,
      platform: navigator.platform
    };
  }
} 