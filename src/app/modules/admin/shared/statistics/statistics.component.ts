import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { AnalyticsService, AdminOverview } from '@shared/services/core-apis/analytics.service';

@Component({
    selector: 'worky-admin-statistics',
    templateUrl: './statistics.component.html',
    styleUrls: ['./statistics.component.scss'],
    standalone: false
})
export class StatisticsComponent implements OnInit, OnDestroy {

  private unsubscribe$ = new Subject<void>();

  isLoading = true;
  error: string | null = null;
  lastUpdated = new Date();

  adminOverview: AdminOverview | null = null;

  get interactionsPerActiveUser(): number {
    if (!this.adminOverview || this.adminOverview.activeUsersToday === 0) return 0;
    const interactionsToday = this.adminOverview.commentsToday + this.adminOverview.reactionsToday;
    return interactionsToday / this.adminOverview.activeUsersToday;
  }

  get contentGrowthRate(): number {
    if (!this.adminOverview) return 0;
    const last = this.adminOverview.publicationsLastWeek;
    const current = this.adminOverview.publicationsThisWeek;
    if (last === 0) return current > 0 ? 100 : 0;
    return ((current - last) / last) * 100;
  }

  get userActivityRate(): number {
    if (!this.adminOverview || this.adminOverview.totalUsers === 0) return 0;
    return (this.adminOverview.activeUsersToday / this.adminOverview.totalUsers) * 100;
  }

  constructor(
    private readonly _analyticsService: AnalyticsService,
    private readonly _cdr: ChangeDetectorRef,
    private readonly _logService: LogService,
  ) {}

  ngOnInit(): void {
    this.loadStatistics();
  }

  loadStatistics(): void {
    this.isLoading = true;
    this.error = null;

    this._analyticsService.getAdminOverview()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (overview) => {
          this.adminOverview = overview;
          this.isLoading = false;
          this.lastUpdated = new Date();
          this._cdr.markForCheck();
        },
        error: (err) => {
          this.error = 'Error al cargar las estadísticas. Por favor, inténtalo de nuevo.';
          this.isLoading = false;
          this._logService.log(
            LevelLogEnum.ERROR,
            'StatisticsComponent',
            'Error loading admin overview',
            { error: String(err) }
          );
          this._cdr.markForCheck();
        },
      });
  }

  refreshStatistics(): void {
    this.loadStatistics();
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }
}
