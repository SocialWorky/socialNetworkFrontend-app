import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';

import { AuthService } from '@auth/services/auth.service';
import { RoleUser } from '@auth/models/roleUser.enum';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {

  constructor(
    private _authService: AuthService,
    private _router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const expectedRole = route.data['expectedRole'];
    const token = this._authService.getDecodedToken();
    const userRole = token?.role;

    if (this._authService.isAuthenticated() && userRole === expectedRole) {
      return true;
    } else {
      this._router.navigate(['/auth']);
      return false;
    }
  }
}
