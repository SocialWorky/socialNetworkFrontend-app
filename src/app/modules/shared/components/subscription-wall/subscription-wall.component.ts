import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SubscriptionWallService } from '@shared/services/subscription-wall.service';
import { translations } from '@translations/translations';

interface FeatureItem {
  label: string;
  icon: string;
}

@Component({
  selector: 'worky-subscription-wall',
  templateUrl: './subscription-wall.component.html',
  styleUrls: ['./subscription-wall.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class SubscriptionWallComponent implements OnInit, OnDestroy {
  isVisible = false;

  readonly title = translations['subscription.accessRequired'];
  readonly description = translations['subscription.accessRequiredMessage'];
  readonly viewPlansLabel = translations['subscription.viewPlans'];
  readonly notNowLabel = translations['subscription.notNow'];
  readonly featuresLabel = translations['subscription.features'];

  readonly features: FeatureItem[] = [
    { label: translations['admin.feature.feed'], icon: 'dynamic_feed' },
    { label: translations['admin.feature.chat'], icon: 'chat_bubble' },
    { label: translations['admin.feature.friends'], icon: 'group' },
    { label: translations['admin.feature.notifications'], icon: 'notifications' },
    { label: translations['admin.feature.profile'], icon: 'person' },
    { label: translations['admin.feature.media_upload'], icon: 'perm_media' },
    { label: translations['admin.feature.search'], icon: 'search' },
    { label: translations['admin.feature.reactions'], icon: 'favorite' },
    { label: translations['admin.feature.comments'], icon: 'mode_comment' },
    { label: translations['admin.feature.widgets'], icon: 'widgets' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private readonly wallService: SubscriptionWallService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.wallService.isVisible$.pipe(takeUntil(this.destroy$)).subscribe((v) => {
      this.isVisible = v;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goToPlans(): void {
    this.wallService.hide();
    this.router.navigate(['/subscribe']);
  }

  dismiss(): void {
    this.wallService.hide();
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('wall-overlay')) {
      this.dismiss();
    }
  }
}
