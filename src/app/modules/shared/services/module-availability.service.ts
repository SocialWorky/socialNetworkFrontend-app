import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, combineLatest, takeUntil } from 'rxjs';

import { ConfigService } from '@shared/services/core-apis/config.service';

@Injectable({ providedIn: 'root' })
export class ModuleAvailabilityService {
  private readonly destroy$ = new Subject<void>();
  private initialized = false;

  // canActivate guards only run on navigation. This list lets us also evict a user
  // who is already inside a module route the instant that module gets disabled.
  private readonly guardedRoutes = [
    { pattern: /^\/groups(\/|$)/, isEnabled: () => this._configService.groupsEnabledSnapshot() },
    { pattern: /^\/events(\/|$)/, isEnabled: () => this._configService.eventsEnabledSnapshot() },
  ];

  constructor(
    private readonly _configService: ConfigService,
    private readonly _router: Router,
  ) {}

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    combineLatest([
      this._configService.groupsEnabled$,
      this._configService.eventsEnabled$,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.enforceCurrentRoute());
  }

  private enforceCurrentRoute(): void {
    const url = this._router.url.split('?')[0];
    const blocked = this.guardedRoutes.find(
      (route) => route.pattern.test(url) && !route.isEnabled(),
    );
    if (blocked) {
      this._router.navigate(['/feature-unavailable']);
    }
  }
}
