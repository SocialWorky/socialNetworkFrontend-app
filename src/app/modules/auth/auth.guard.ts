import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';

export const AuthGuard: CanActivateFn = (route, state) => {
  const authService = new AuthService(new Router());
  return authService.isAuthenticated();
}
