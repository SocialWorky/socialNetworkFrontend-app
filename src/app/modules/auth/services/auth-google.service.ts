import { Injectable } from '@angular/core';
import { AuthConfig, OAuthService } from 'angular-oauth2-oidc'
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthGoogleService {

  constructor(private oauthService: OAuthService) {
    this.initLogin();
  }

  initLogin() {
    const config: AuthConfig = {
      issuer: 'https://accounts.google.com',
      strictDiscoveryDocumentValidation: false,
      clientId: `${environment.clienIdGoogle}`,
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
