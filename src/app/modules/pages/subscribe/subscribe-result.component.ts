import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SubscriptionService } from '@shared/services/subscription.service';
import { translations } from '@translations/translations';

@Component({
  selector: 'worky-subscribe-result',
  template: `
    <div class="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div class="text-center max-w-md">
        <ng-container *ngIf="isSuccess">
          <i class="material-icons text-6xl text-green-400 mb-4">check_circle</i>
          <h1 class="text-2xl font-bold text-slate-100 mb-3">{{ t['subscription.paymentSuccessful'] }}</h1>
        </ng-container>
        <ng-container *ngIf="!isSuccess">
          <i class="material-icons text-6xl text-red-400 mb-4">error</i>
          <h1 class="text-2xl font-bold text-slate-100 mb-3">{{ t['subscription.paymentFailed'] }}</h1>
        </ng-container>
        <button (click)="goHome()"
          class="mt-6 px-8 py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-colors">
          {{ t['button.ok'] }}
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class SubscribeResultComponent implements OnInit {
  isSuccess = false;
  readonly t = translations;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly subscriptionService: SubscriptionService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const status = this.route.snapshot.queryParamMap.get('status');
    this.isSuccess = status === 'success' || status === '1';

    if (this.isSuccess) {
      this.subscriptionService.loadMySubscription().subscribe();
    }

    this.cdr.markForCheck();
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
