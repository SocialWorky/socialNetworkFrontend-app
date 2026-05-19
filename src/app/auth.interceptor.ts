import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpInterceptor,
  HttpHandler,
  HttpRequest,
  HttpErrorResponse,
  HttpClient
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, of, EMPTY } from 'rxjs';
import { catchError, filter, take, switchMap, finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '@env/environment';
import { LogService, LevelLogEnum } from './modules/shared/services/core-apis/log.service';
import { SubscriptionWallService } from './modules/shared/services/subscription-wall.service';
import { FeatureWallService } from './modules/shared/services/feature-wall.service';
import { SubscriptionService } from './modules/shared/services/subscription.service';

interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

  constructor(
    private router: Router,
    private http: HttpClient,
    private logService: LogService,
    private subscriptionWallService: SubscriptionWallService,
    private featureWallService: FeatureWallService,
    private subscriptionService: SubscriptionService,
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

    const AUTH_URLS = [
      '/user/login', '/user/loginGoogle', '/user/create',
      '/auth/refresh',
      '/email/forgotPassword', '/email/resetPassword',
      '/records-logs',      // internal logging — must never block
      '/app/version',       // version check on startup
    ];
    const isAuthUrl = AUTH_URLS.some((path) => request.url.includes(path));

    if (isApiRequest && !isAuthUrl) {
      const token = localStorage.getItem('token');
      if (token && token !== 'undefined' && token !== 'null') {
        request = this.addToken(request, token);
      }
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && isApiRequest) {
          if (request.url.includes('/auth/refresh')) {
            this.clearSession();
            this.redirectToLogin();
            return throwError(() => error);
          }
          return this.handle401Error(request, next);
        }

        if (error.status === 402 && isApiRequest) {
          if (request.method === 'GET' || isAuthUrl) {
            return EMPTY;
          }
          this.subscriptionWallService.show();
          return throwError(() => error);
        }

        if (error.status === 403 && isApiRequest && error.error?.message === 'feature_not_in_plan') {
          const blockedFeature: string = error.error?.feature ?? '';
          const planFeatures: string[] = this.subscriptionService.getPlanFeatures();
          this.featureWallService.show(blockedFeature, planFeatures);
          return throwError(() => error);
        }

        return throwError(() => error);
      })
    );
  }

  private addToken(request: HttpRequest<any>, token: string): HttpRequest<any> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken && refreshToken !== 'undefined' && refreshToken !== 'null') {
        return this.refreshAccessToken(refreshToken).pipe(
          switchMap((response: RefreshTokenResponse) => {
            this.isRefreshing = false;

            // Store new tokens
            localStorage.setItem('token', response.accessToken);
            localStorage.setItem('refreshToken', response.refreshToken);
            localStorage.setItem('tokenExpiresAt', String(Date.now() + (response.expiresIn * 1000)));

            this.refreshTokenSubject.next(response.accessToken);

            // Retry the original request with new token
            return next.handle(this.addToken(request, response.accessToken));
          }),
          catchError((err) => {
            this.isRefreshing = false;
            this.clearSession();
            this.redirectToLogin();
            return throwError(() => err);
          }),
          finalize(() => {
            this.isRefreshing = false;
          })
        );
      } else {
        // No refresh token available
        this.isRefreshing = false;
        this.clearSession();
        this.redirectToLogin();
        return throwError(() => new Error('No refresh token available'));
      }
    } else {
      // Wait for the refresh to complete and retry
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(token => {
          return next.handle(this.addToken(request, token!));
        })
      );
    }
  }

  private refreshAccessToken(refreshToken: string): Observable<RefreshTokenResponse> {
    return this.http.post<RefreshTokenResponse>(
      `${environment.API_URL}/auth/refresh`,
      { refreshToken }
    );
  }

  private redirectToLogin(): void {
    const currentUrl = this.router.url;
    if (!currentUrl.includes('/auth/login') && !currentUrl.includes('/auth')) {
      this.router.navigate(['/auth/login']);
    }
  }

  private clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiresAt');
    localStorage.removeItem('lastLogin');
    sessionStorage.clear();
  }
}
