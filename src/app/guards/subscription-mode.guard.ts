import { CanActivateFn } from '@angular/router';

// Users can navigate the app regardless of subscription status.
// The subscription wall (SubscriptionWallService) appears when they attempt
// a write action (POST/PUT/DELETE) that returns 402 from the backend.
export const subscriptionModeGuard: CanActivateFn = () => true;
