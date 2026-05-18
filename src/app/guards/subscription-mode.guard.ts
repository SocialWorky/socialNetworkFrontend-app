import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@shared/services/core-apis/config.service';
import { SubscriptionService } from '@shared/services/subscription.service';
import { AuthService } from '@auth/services/auth.service';
import { RoleUser } from '@auth/models/roleUser.enum';

export const subscriptionModeGuard: CanActivateFn = async (_route, state) => {
  const configService = inject(ConfigService);
  const subscriptionService = inject(SubscriptionService);
  const authService = inject(AuthService);
  const router = inject(Router);

  if (state.url.startsWith('/subscribe')) return true;

  const config = configService.configSnapshot();
  const modeOn = config?.settings?.subscriptionMode === true;
  if (!modeOn) return true;

  const decoded = authService.getDecodedToken();
  if (decoded?.role === RoleUser.ADMIN) return true;

  if (subscriptionService.isPremiumSnapshot()) return true;

  // Subscription state not yet loaded — fetch it before deciding
  const currentSub = subscriptionService['subscriptionSubject'].value;
  if (currentSub === null) {
    try {
      await firstValueFrom(subscriptionService.loadMySubscription());
    } catch {
      // Network error: treat as no subscription
    }
    if (subscriptionService.isPremiumSnapshot()) return true;
  }

  return router.createUrlTree(['/subscribe']);
};
