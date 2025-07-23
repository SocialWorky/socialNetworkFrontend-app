import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '@env/environment';
import { LogService, LevelLogEnum } from './modules/shared/services/core-apis/log.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private router: Router,
    private logService: LogService
  ) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {

    const apiUrls = [
      environment.API_URL,
      environment.APIFILESERVICE,
      environment.APIMESSAGESERVICE,
      environment.APINOTIFICATIONCENTER,
    ];

    const isApiRequest = apiUrls.some((url) => request.url.startsWith(url));

    if (isApiRequest) {
      const token = localStorage.getItem('token');
      if (token && token !== 'undefined' && token !== 'null') {
        request = request.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    }

    return next.handle(request).pipe(
      catchError((error) => {
        if (error.status === 401) {
          this.logService.log(
            LevelLogEnum.WARN,
            'AuthInterceptor',
            'Unauthorized request, clearing session',
            { url: request.url, status: error.status }
          );
          
          const currentUrl = this.router.url;
          if (!currentUrl.includes('/auth/login')) {
            this.clearSession();
            this.router.navigate(['/auth/login']);
          }
        }
        return throwError(() => error);
      })
    );
  }

  private clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('lastLogin');
    sessionStorage.clear();
  }
}
