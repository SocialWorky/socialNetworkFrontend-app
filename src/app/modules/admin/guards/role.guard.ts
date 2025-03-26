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

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    const expectedRole = route.data['expectedRole'];

    if (await this._authService.isAuthenticated()) {
      const token = this._authService.getDecodedToken();
      const userRole = token?.role;
      return userRole === expectedRole;
    } else {
      this._router.navigate(['/auth']);
      return false;
    }
  }
}
