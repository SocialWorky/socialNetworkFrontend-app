import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router,
    private logService: LogService
  ) {}

  async canActivate(): Promise<boolean> {
    try {
      const isAuthenticated = await this.authService.isAuthenticated();
      
      if (isAuthenticated) {
        return true;
      } else {
        // User not authenticated, redirecting to login - no need to log every redirect
        this.router.navigate(['/auth/login']);
        return false;
      }
    } catch (error) {
      this.logService.log(
        LevelLogEnum.ERROR,
        'AuthGuard',
        'Error checking authentication',
        { error: error instanceof Error ? error.message : String(error) }
      );
      this.router.navigate(['/auth/login']);
      return false;
    }
  }
}
