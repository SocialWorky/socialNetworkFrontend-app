import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ConfigService } from '@shared/services/core-apis/config.service';
import { UtilityService } from '@shared/services/utility.service';
import { environment } from '@env/environment';

@Component({
  selector: 'app-premium-badge',
  template: `
    <ng-container *ngIf="isPremium && subscriptionEnabled">
      <img
        *ngIf="badgeUrl; else defaultBadge"
        [src]="badgeUrl"
        title="Premium Member"
        aria-label="Premium Member"
        style="display:inline-flex;width:1.1em;height:1.1em;margin-left:3px;vertical-align:middle;object-fit:contain;"
      />
      <ng-template #defaultBadge>
        <span
          class="premium-badge"
          title="Premium Member"
          aria-label="Premium Member">
          ⭐
        </span>
      </ng-template>
    </ng-container>
  `,
  styles: [`
    .premium-badge {
      display: inline-flex;
      align-items: center;
      font-size: 0.85em;
      line-height: 1;
      cursor: default;
      user-select: none;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class PremiumBadgeComponent implements OnInit, OnDestroy {
  @Input() isPremium: boolean | undefined = false;

  badgeUrl: string | null = null;
  subscriptionEnabled = false;

  private destroy$ = new Subject<void>();

  constructor(
    private _configService: ConfigService,
    private _utilityService: UtilityService,
    private _cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this._configService.config$.pipe(takeUntil(this.destroy$)).subscribe(config => {
      this.subscriptionEnabled = config?.settings?.subscriptionMode ?? config?.subscriptionMode ?? false;
      const raw = config?.settings?.premiumBadgeUrl || config?.premiumBadgeUrl || null;
      this.badgeUrl = raw ? this._utilityService.normalizeImageUrl(raw, environment.MINIO_BUCKET_URL || '') : null;
      this._cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
