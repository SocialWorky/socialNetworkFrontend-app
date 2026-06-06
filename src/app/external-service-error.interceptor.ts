import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';

/**
 * Interceptor to silently handle errors from external services
 * (geo-locations, news, weather, etc.) to prevent console errors
 * when services are unavailable or return CORS/502 errors
 */
@Injectable()
export class ExternalServiceErrorInterceptor implements HttpInterceptor {
  
  private readonly externalServiceDomains = [
    'geo-dev.worky.cl',
    'geo.worky.cl',
    'geo-prod.worky.cl',
    'geolocation-service-dev.worky.cl',
    'geolocation-service.worky.cl',
    'geolocation-service-prod.worky.cl',
    'weather-api.worky.cl',
    'weather-api-dev.worky.cl',
    'weather-api-prod.worky.cl',
    'api.opencagedata.com',
    'api.openweathermap.org',
  ];

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Check if this is a request to an external service
    const isExternalService = this.isExternalServiceRequest(request.url);
    
    if (!isExternalService) {
      return next.handle(request);
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Silently handle common external service errors
        // Status 0 = Network error (CORS, connection refused, etc.)
        // Status 502 = Bad Gateway (service unavailable)
        // Status 503 = Service Unavailable
        // Status 504 = Gateway Timeout
        if (error.status === 0 ||
            error.status === 401 ||
            error.status === 403 ||
            error.status === 429 ||
            error.status === 502 ||
            error.status === 503 ||
            error.status === 504) {
          
          // Return empty response based on expected response type
          const response = new HttpResponse({
            status: 200,
            statusText: 'OK',
            body: this.getDefaultResponse(request.url),
            url: request.url
          });
          return of(response);
        }
        
        // For other errors, let them propagate (but they should be handled by the component)
        throw error;
      })
    );
  }

  private isExternalServiceRequest(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      // Check if it's one of the external service domains
      return this.externalServiceDomains.some(domain => 
        hostname === domain || hostname.endsWith('.' + domain)
      );
    } catch {
      // If URL parsing fails, check if it contains the geo-locations API URL
      return url.includes(environment.APIGEOLOCATIONS) && 
             !url.includes('localhost') && 
             !url.includes('127.0.0.1');
    }
  }

  private getDefaultResponse(url: string): any {
    // Return appropriate default response based on endpoint
    if (url.includes('/news')) {
      return [];
    }
    if (url.includes('/locations')) {
      return null;
    }
    if (url.includes('/weather')) {
      return null;
    }
    return null;
  }
}
