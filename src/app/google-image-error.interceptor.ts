import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';

@Injectable()
export class GoogleImageErrorInterceptor implements HttpInterceptor {
  private readonly GOOGLE_DOMAINS = [
    'lh3.googleusercontent.com',
    'lh4.googleusercontent.com',
    'lh5.googleusercontent.com',
    'lh6.googleusercontent.com'
  ];

  constructor(private logService: LogService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Block all Google Image requests to prevent CORS issues
    if (this.isGoogleImageRequest(request.url)) {
      this.logService.log(
        LevelLogEnum.INFO,
        'GoogleImageErrorInterceptor',
        'Blocking Google Image request to prevent CORS issues',
        { url: request.url }
      );
      // Return a controlled error instead of making the request
      return throwError(() => new Error('Google image requests blocked to prevent CORS issues'));
    }

    return next.handle(request);
  }

  private isGoogleImageRequest(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return this.GOOGLE_DOMAINS.some(domain => urlObj.hostname.includes(domain));
    } catch {
      return false;
    }
  }

  private isGoogleImageError(error: HttpErrorResponse): boolean {
    // Errores específicos de Google Images
    return (
      error.status === 429 || // Too Many Requests
      error.status === 403 || // Forbidden (CORS)
      error.status === 0 ||   // Network error (CORS)
      (error.status >= 500 && error.status < 600) // Server errors
    );
  }

  private handleGoogleImageError(error: HttpErrorResponse, request: HttpRequest<any>): void {
    const errorInfo = {
      url: request.url,
      status: error.status,
      statusText: error.statusText,
      message: error.message,
      timestamp: new Date().toISOString()
    };

    switch (error.status) {
      case 429:
        this.logService.log(
          LevelLogEnum.WARN,
          'GoogleImageErrorInterceptor',
          'Rate limit exceeded for Google Images',
          errorInfo
        );
        break;
      
      case 403:
        this.logService.log(
          LevelLogEnum.WARN,
          'GoogleImageErrorInterceptor',
          'CORS error accessing Google Images',
          errorInfo
        );
        break;
      
      case 0:
        this.logService.log(
          LevelLogEnum.WARN,
          'GoogleImageErrorInterceptor',
          'Network error accessing Google Images',
          errorInfo
        );
        break;
      
      default:
        this.logService.log(
          LevelLogEnum.WARN,
          'GoogleImageErrorInterceptor',
          'Google Images server error',
          errorInfo
        );
        break;
    }
  }
} 