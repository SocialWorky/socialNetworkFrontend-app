import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ConfigService } from '@shared/services/core-apis/config.service';

export function featureEnabledGuard(feature: 'groups' | 'events'): CanActivateFn {
  return () => {
    const configService = inject(ConfigService);
    const router = inject(Router);

    const enabled = feature === 'groups'
      ? configService.groupsEnabledSnapshot()
      : configService.eventsEnabledSnapshot();

    if (!enabled) {
      router.navigate(['/feature-unavailable']);
      return false;
    }

    return true;
  };
}
