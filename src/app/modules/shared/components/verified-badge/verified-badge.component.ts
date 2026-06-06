import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ConfigService } from '@shared/services/core-apis/config.service';
import { UtilityService } from '@shared/services/utility.service';
import { environment } from '@env/environment';

@Component({
  selector: 'app-verified-badge',
  template: `
    <ng-container *ngIf="isAccountVerified">
      <img
        *ngIf="badgeUrl; else defaultBadge"
        [src]="badgeUrl"
        title="Cuenta verificada"
        aria-label="Cuenta verificada"
        style="display:inline-flex;width:1.1em;height:1.1em;margin-left:3px;margin-right:3px;vertical-align:middle;object-fit:contain;"
        (error)="onImageError()"
      />
      <ng-template #defaultBadge>
        <span
          title="Cuenta verificada"
          aria-label="Cuenta verificada"
          style="display:inline-flex;align-items:center;color:#1DA1F2;font-size:0.9em;margin-left:2px;margin-right:3px;cursor:default;user-select:none;">
          ✓
        </span>
      </ng-template>
    </ng-container>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class VerifiedBadgeComponent implements OnInit, OnDestroy {
  @Input() isAccountVerified: boolean | undefined = false;

  badgeUrl: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private _configService: ConfigService,
    private _utilityService: UtilityService,
    private _cdr: ChangeDetectorRef,
  ) {}

  onImageError(): void {
    this.badgeUrl = null;
    this._cdr.markForCheck();
  }

  ngOnInit(): void {
    this._configService.config$.pipe(takeUntil(this.destroy$)).subscribe(config => {
      const raw = config?.settings?.verifiedBadgeUrl || config?.verifiedBadgeUrl || null;
      const normalized = raw ? this._utilityService.normalizeImageUrl(raw, environment.MINIO_BUCKET_URL || '') : null;
      this.badgeUrl = normalized || null;
      this._cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
