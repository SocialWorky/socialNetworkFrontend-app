import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, interval, takeUntil } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

import { ExploreService, ExploreUser } from '@shared/services/core-apis/explore.service';
import { NotificationUsersService } from '@shared/services/notifications/notificationUsers.service';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { Token } from '@shared/interfaces/token.interface';

@Component({
  selector: 'worky-nearby-users',
  templateUrl: './nearby-users.component.html',
  styleUrls: ['./nearby-users.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class NearbyUsersComponent implements OnInit, OnDestroy {
  private readonly _destroy$ = new Subject<void>();

  private readonly REFRESH_INTERVAL = 60000;
  private readonly PAGE_SIZE = 15;
  private readonly RADIUS_STORAGE_KEY = 'worky_nearby_radius';

  readonly radiusOptions = [1, 5, 25, 50, 100];

  radiusKm = signal<number>(this.readStoredRadius());
  onlineOnly = signal<boolean>(true);

  isLoading = signal<boolean>(true);
  isLoadingMore = signal<boolean>(false);
  discoveryEnabled = signal<boolean>(false);

  private allUsers = signal<ExploreUser[]>([]);
  total = signal<number>(0);
  private currentPage = 1;

  // userId -> live presence status ('online' | 'inactive' | 'offLine')
  private statusMap = signal<Map<string, string>>(new Map());

  displayedUsers = computed<ExploreUser[]>(() => {
    const users = this.allUsers();
    if (!this.onlineOnly()) return users;
    const map = this.statusMap();
    return users.filter((u) => this.isActiveStatus(map.get(u._id)));
  });

  canLoadMore = computed<boolean>(() => this.allUsers().length < this.total());

  constructor(
    private readonly _exploreService: ExploreService,
    private readonly _notificationUsersService: NotificationUsersService,
    private readonly _router: Router,
    private readonly _logService: LogService,
  ) {}

  ngOnInit(): void {
    // Live presence: build a userId -> status map from the WebSocket online list.
    this._notificationUsersService.userStatuses$
      .pipe(takeUntil(this._destroy$))
      .subscribe((statuses: Token[]) => {
        const map = new Map<string, string>();
        statuses.forEach((s) => {
          if (s.id) map.set(s.id, s.status ?? 'offLine');
        });
        this.statusMap.set(map);
      });

    // React to the location toggle (initial + changes from the profile page).
    this._exploreService.locationStatus$
      .pipe(
        map((status) => status.discoveryEnabled),
        distinctUntilChanged(),
        takeUntil(this._destroy$),
      )
      .subscribe((enabled) => {
        this.discoveryEnabled.set(enabled);
        if (enabled) {
          this.reload();
        } else {
          this.allUsers.set([]);
          this.total.set(0);
          this.isLoading.set(false);
        }
      });

    this._exploreService.getLocationStatus().pipe(takeUntil(this._destroy$)).subscribe({
      error: (error) => {
        this._logService.log(LevelLogEnum.ERROR, 'NearbyUsersComponent', 'Error getting location status', { error: String(error) });
        this.isLoading.set(false);
      },
    });

    // Poll so newly-active/nearby users appear; only when the list isn't expanded.
    interval(this.REFRESH_INTERVAL)
      .pipe(takeUntil(this._destroy$))
      .subscribe(() => {
        if (this.discoveryEnabled() && this.currentPage === 1) {
          this.fetchPage(1, { replace: true, silent: true });
        }
      });
  }

  setRadius(radius: number): void {
    if (radius === this.radiusKm()) return;
    this.radiusKm.set(radius);
    this.storeRadius(radius);
    this.reload();
  }

  toggleOnlineOnly(): void {
    this.onlineOnly.set(!this.onlineOnly());
  }

  loadMore(): void {
    if (this.isLoadingMore()) return;
    this.isLoadingMore.set(true);
    this.fetchPage(this.currentPage + 1, { replace: false, silent: true });
  }

  statusOf(userId: string): string {
    return this.statusMap().get(userId) ?? 'offLine';
  }

  isOnline(userId: string): boolean {
    return this.statusMap().get(userId) === 'online';
  }

  isInactive(userId: string): boolean {
    return this.statusMap().get(userId) === 'inactive';
  }

  goToProfile(userId: string): void {
    this._router.navigate(['/profile', userId]);
  }

  goToMyProfile(): void {
    this._router.navigate(['/profile']);
  }

  private reload(): void {
    this.currentPage = 1;
    this.isLoading.set(true);
    this.fetchPage(1, { replace: true, silent: false });
  }

  private fetchPage(page: number, opts: { replace: boolean; silent: boolean }): void {
    this._exploreService
      .getNearbyUsers({
        radiusKm: this.radiusKm(),
        page,
        pageSize: this.PAGE_SIZE,
        bypassCache: true,
      })
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (res) => {
          this.total.set(res.total);
          this.currentPage = page;
          this.allUsers.set(opts.replace ? res.users : [...this.allUsers(), ...res.users]);
          this.isLoading.set(false);
          this.isLoadingMore.set(false);
        },
        error: (error) => {
          this._logService.log(LevelLogEnum.ERROR, 'NearbyUsersComponent', 'Error getting nearby users', { error: String(error) });
          this.isLoading.set(false);
          this.isLoadingMore.set(false);
        },
        complete: () => {
          this.isLoading.set(false);
          this.isLoadingMore.set(false);
        },
      });
  }

  private isActiveStatus(status?: string): boolean {
    return status === 'online' || status === 'inactive';
  }

  private readStoredRadius(): number {
    try {
      const stored = Number(localStorage.getItem(this.RADIUS_STORAGE_KEY));
      return this.radiusOptions.includes(stored) ? stored : 50;
    } catch {
      return 50;
    }
  }

  private storeRadius(radius: number): void {
    try {
      localStorage.setItem(this.RADIUS_STORAGE_KEY, String(radius));
    } catch {
      // Ignore storage errors (private mode / quota).
    }
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }
}
