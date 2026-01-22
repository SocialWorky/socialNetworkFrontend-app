import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';

@Injectable()
export class Silent404Interceptor implements HttpInterceptor {
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const isVersionEndpoint = request.url.includes('/app/version') && 
                              request.url.startsWith(environment.API_URL);
    
    if (!isVersionEndpoint) {
      return next.handle(request);
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
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
