import { Injectable, OnDestroy } from '@angular/core';
import { AuthConfig, OAuthService } from 'angular-oauth2-oidc'
import { environment } from '@env/environment';
import { ConfigService } from '@shared/services/core-apis/config.service';
import { Subject, takeUntil } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthGoogleService implements OnDestroy {

  private _destroy$ = new Subject<void>();

  constructor(
    private oauthService: OAuthService,
    private _configService: ConfigService
  ) {
    this._configService.getLoginMethods()
    .pipe(takeUntil(this._destroy$))
    .subscribe(methods => {
      if (methods.google) {
        this.initLogin();
      }
    });
  }
  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  initLogin() {
    const config: AuthConfig = {
      issuer: 'https://accounts.google.com',
      strictDiscoveryDocumentValidation: false,
      clientId: `${environment.CLIEN_ID_GOOGLE}`,
      redirectUri: window.location.origin + '/auth/login',
      scope: 'openid profile email',
    }

    this.oauthService.configure(config);
    this.oauthService.setupAutomaticSilentRefresh();
    this.oauthService.loadDiscoveryDocumentAndTryLogin();
  }

  async login() {
    await this.oauthService.initLoginFlow();
  }

  logout() {
    this.oauthService.logOut();
  }

  getProfile() {
   return this.oauthService.getIdentityClaims();
  }

}
