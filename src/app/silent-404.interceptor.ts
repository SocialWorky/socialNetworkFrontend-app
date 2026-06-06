import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';

/**
 * Interceptor to silently handle 404 errors for the app/version endpoint
 * This prevents console errors when the version endpoint is not available
 */
@Injectable()
export class Silent404Interceptor implements HttpInterceptor {
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const isVersionEndpoint = request.url.includes('/app/version') && 
                              (request.url.startsWith(environment.API_URL) || 
                               request.url.includes('/api/v1/app/version'));
    
    if (!isVersionEndpoint) {
      return next.handle(request);
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle 404 and network errors (status 0) for version endpoint
        if (error.status === 404 || error.status === 0) {
          const response = new HttpResponse({
            status: 200,
            statusText: 'OK',
            body: { success: false, data: null },
            url: request.url
          });
          return of(response);
        }
        throw error;
      })
    );
  }
}
