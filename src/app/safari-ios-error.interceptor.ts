import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';

@Injectable()
export class SafariIOSErrorInterceptor implements HttpInterceptor {
  private isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  private isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

  constructor(private logService: LogService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Only apply this interceptor for Safari iOS
    if (!this.isIOS || !this.isSafari) {
      return next.handle(request);
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Check if this is an IndexedDB related error
        if (this.isIndexedDBError(error)) {
          this.logService.log(LevelLogEnum.WARN, 'SafariIOSErrorInterceptor', 'IndexedDB error intercepted', {
            url: request.url,
            error: error.message
          });
          
          // For IndexedDB errors, we don't want to propagate them
          // Instead, we'll return a controlled error that won't break the app
          return throwError(() => new Error('Storage operation failed - using fallback mode'));
        }

        // Check for 404 errors on images
        if (error.status === 404 && this.isImageRequest(request)) {
          this.logService.log(LevelLogEnum.WARN, 'SafariIOSErrorInterceptor', '404 error on image request', {
            url: request.url
          });
          
          // For 404 errors on images, we can provide a fallback
          return throwError(() => new Error('Image not found - using fallback'));
        }

        // For other errors, let them propagate normally
        return throwError(() => error);
      })
    );
  }

  private isIndexedDBError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message || error.toString();
    return errorMessage.includes('IndexedDB') || 
           errorMessage.includes('Blob') || 
           errorMessage.includes('File') ||
           errorMessage.includes('object store') ||
           error.name === 'UnknownError' ||
           (errorMessage.includes('UnknownError') && errorMessage.includes('Blob'));
  }

  private isImageRequest(request: HttpRequest<any>): boolean {
    const url = request.url.toLowerCase();
    return url.includes('.jpg') || 
           url.includes('.jpeg') || 
           url.includes('.png') || 
           url.includes('.gif') || 
           url.includes('.webp') ||
           url.includes('image') ||
           url.includes('compressed');
  }
} 