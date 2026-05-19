import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { FeatureWallService } from '@shared/services/feature-wall.service';
import { translations } from '@translations/translations';

interface FeatureItem {
  label: string;
  icon: string;
}

const FEATURE_MAP: Record<string, FeatureItem> = {
  feed:           { label: translations['admin.feature.feed'],          icon: 'dynamic_feed' },
  chat:           { label: translations['admin.feature.chat'],          icon: 'chat_bubble' },
  friends:        { label: translations['admin.feature.friends'],       icon: 'group' },
  notifications:  { label: translations['admin.feature.notifications'], icon: 'notifications' },
  profile:        { label: translations['admin.feature.profile'],       icon: 'person' },
  media_upload:   { label: translations['admin.feature.media_upload'],  icon: 'perm_media' },
  search:         { label: translations['admin.feature.search'],        icon: 'search' },
  reactions:      { label: translations['admin.feature.reactions'],     icon: 'favorite' },
  comments:       { label: translations['admin.feature.comments'],      icon: 'mode_comment' },
  widgets:        { label: translations['admin.feature.widgets'],       icon: 'widgets' },
};

@Component({
  selector: 'worky-feature-wall',
  templateUrl: './feature-wall.component.html',
  styleUrls: ['./feature-wall.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class FeatureWallComponent implements OnInit, OnDestroy {
  isVisible = false;
  blockedFeature: FeatureItem = { label: '', icon: 'lock' };
  planFeatures: FeatureItem[] = [];

  readonly title = translations['featureWall.title'];
  readonly viewPlansLabel = translations['subscription.viewPlans'];
  readonly notNowLabel = translations['subscription.notNow'];
  readonly currentPlanLabel = translations['featureWall.currentPlan'];

  private destroy$ = new Subject<void>();

  constructor(
    private readonly wallService: FeatureWallService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.wallService.featureWall$.pipe(takeUntil(this.destroy$)).subscribe((state) => {
      this.isVisible = state.visible;
      this.blockedFeature = FEATURE_MAP[state.blockedFeature] ?? { label: state.blockedFeature, icon: 'lock' };
      this.planFeatures = state.planFeatures
        .map((id) => FEATURE_MAP[id])
        .filter(Boolean);
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
    if ((event.target as HTMLElement).classList.contains('feature-wall-overlay')) {
      this.dismiss();
    }
  }
}
