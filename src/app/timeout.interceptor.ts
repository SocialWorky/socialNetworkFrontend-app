import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { retryWhen, delayWhen, take, catchError } from 'rxjs/operators';
import { LogService, LevelLogEnum } from './modules/shared/services/core-apis/log.service';

@Injectable()
export class TimeoutInterceptor implements HttpInterceptor {
  private readonly DEFAULT_TIMEOUT = 15000; // 15 seconds
  private readonly MAX_RETRIES = 2;
  private readonly RETRY_DELAY = 1000;

  constructor(private logService: LogService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Only add timeout header to internal requests (not external APIs)
    const isInternalRequest = this.isInternalRequest(request.url);
    
    let processedRequest = request;
    if (isInternalRequest) {
      processedRequest = request.clone({
        setHeaders: {
          'X-Request-Timeout': this.DEFAULT_TIMEOUT.toString()
        }
      });
    }

    return next.handle(processedRequest).pipe(
      retryWhen(errors => 
        errors.pipe(
          delayWhen((error, index) => {
            if (index >= this.MAX_RETRIES) {
              return throwError(() => error);
            }
            
            // Only retry on specific errors
            if (this.shouldRetry(error)) {
              this.logService.log(
                LevelLogEnum.WARN,
                'TimeoutInterceptor',
                'Retrying request',
                {
                  url: request.url,
                  attempt: index + 1,
                  error: error.message
                }
              );
              return timer(this.RETRY_DELAY * (index + 1));
            }
            
            return throwError(() => error);
          }),
          take(this.MAX_RETRIES)
        )
      ),
      catchError((error: HttpErrorResponse) => {
        this.handleError(error, request);
        return throwError(() => error);
      })
    );
  }

  private shouldRetry(error: HttpErrorResponse): boolean {
    // Retry on network errors, timeouts, and 5xx server errors
    return (
      error.status === 0 || // Network error
      error.status === 408 || // Request timeout
      error.status === 429 || // Too many requests
      error.status >= 500 // Server errors
    );
  }

  private isInternalRequest(url: string): boolean {
    // Check if the request is to an internal API (your backend)
    // Only add timeout header to specific internal services that support it
    const internalDomains = [
      'localhost',
      '127.0.0.1',
      'api.worky.cl', // Main API
      'file-service-dev.worky.cl' // File service that supports timeout headers
    ];
    
    // Explicitly exclude external services that don't support custom headers
    const externalServices = [
      'notification-center-dev.worky.cl',
      'notification-center.worky.cl',
      'notification-center-prod.worky.cl',
      'message-service-dev.worky.cl',
      'message-service.worky.cl',
      'message-service-prod.worky.cl',
      'geolocation-service-dev.worky.cl',
      'geolocation-service.worky.cl',
      'geolocation-service-prod.worky.cl',
      'weather-api.worky.cl',
      'weather-api-dev.worky.cl',
      'weather-api-prod.worky.cl',
      'giphy.com',
      'api.giphy.com',
      'opencagedata.com',
      'api.opencagedata.com'
    ];
    
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      // First check if it's an explicitly excluded external service
      if (externalServices.some(service => hostname === service || hostname.endsWith('.' + service))) {
        return false;
      }
      
      // Then check if it's an internal service
      return internalDomains.some(domain => hostname === domain);
    } catch {
      // If URL parsing fails, assume it's external to be safe
      return false;
    }
  }

  private handleError(error: HttpErrorResponse, request: HttpRequest<any>): void {
    const errorInfo = {
      url: request.url,
      method: request.method,
      status: error.status,
      message: error.message,
      timestamp: new Date().toISOString()
    };

    if (error.status === 504) {
      this.logService.log(LevelLogEnum.ERROR, 'TimeoutInterceptor', 'Gateway timeout detected', errorInfo);
    } else if (error.status === 0) {
      this.logService.log(LevelLogEnum.ERROR, 'TimeoutInterceptor', 'Network error - possible connectivity issue', errorInfo);
    } else if (error.status >= 500) {
      this.logService.log(LevelLogEnum.ERROR, 'TimeoutInterceptor', 'Server error detected', errorInfo);
    } else {
      this.logService.log(LevelLogEnum.WARN, 'TimeoutInterceptor', 'HTTP request failed', errorInfo);
    }
  }
} 