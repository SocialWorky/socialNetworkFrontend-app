import { Component, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

import { CacheManagementService } from './cache-management.service';
import { UnifiedCacheService } from '@shared/services/unified-cache.service';
import { AlertService } from '@shared/services/alert.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { translations } from '@translations/translations';

@Component({
  selector: 'worky-cache-management',
  templateUrl: './cache-management.component.html',
  styleUrls: ['./cache-management.component.scss'],
  standalone: false,
})
export class CacheManagementComponent implements OnDestroy {
  readonly dedupDestinations = ['emojis', 'publications', 'comments', 'profileImg', 'all'];

  dedupDestination = 'emojis';
  isClearingDedup = false;
  isClearingLocal = false;

  private destroy$ = new Subject<void>();

  constructor(
    private readonly _cacheManagementService: CacheManagementService,
    private readonly _unifiedCache: UnifiedCacheService,
    private readonly _alertService: AlertService,
    private readonly _cdr: ChangeDetectorRef,
  ) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  clearDedup(): void {
    this.isClearingDedup = true;
    const destination = this.dedupDestination === 'all' ? undefined : this.dedupDestination;

    this._cacheManagementService
      .clearDedupCache(destination)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.isClearingDedup = false;
          this._cdr.markForCheck();
          this._alertService.showAlert(
            translations['admin.cacheManagement.success.title'],
            `${translations['admin.cacheManagement.success.dedupCleared']} (${res.cleared})`,
            Alerts.SUCCESS,
            Position.CENTER,
            true,
            translations['button.ok'],
          );
        },
        error: () => {
          this.isClearingDedup = false;
          this._cdr.markForCheck();
          this._alertService.showAlert(
            translations['admin.cacheManagement.errors.title'],
            translations['admin.cacheManagement.errors.dedupFailed'],
            Alerts.ERROR,
            Position.CENTER,
            true,
            translations['button.ok'],
          );
        },
      });
  }

  clearLocal(): void {
    this.isClearingLocal = true;
    this._unifiedCache.clearAll();
    this.isClearingLocal = false;
    this._cdr.markForCheck();

    this._alertService.showAlert(
      translations['admin.cacheManagement.success.title'],
      translations['admin.cacheManagement.success.localCleared'],
      Alerts.SUCCESS,
      Position.CENTER,
      true,
      translations['button.ok'],
    );
  }
}
