import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@services/core-apis/config.service';

export const adminSubscriptionEnabledGuard: CanActivateFn = async () => {
  const configService = inject(ConfigService);
  const router = inject(Router);
  const enabled = await firstValueFrom(configService.getSubscriptionMode());
  if (!enabled) {
    router.navigate(['/admin']);
    return false;
  }
  return true;
};
