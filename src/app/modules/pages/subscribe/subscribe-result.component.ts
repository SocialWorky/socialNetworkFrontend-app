import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subject, interval, switchMap, takeUntil } from 'rxjs';
import { SubscriptionService } from '@shared/services/subscription.service';
import { translations } from '@translations/translations';

const POLL_INTERVAL_MS = 2500;
const POLL_MAX_ATTEMPTS = 8; // ~20 seconds total

@Component({
  selector: 'worky-subscribe-result',
  template: `
    <div class="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div class="text-center max-w-md">

        <!-- Loading / polling -->
        <ng-container *ngIf="state === 'loading'">
          <div class="subscribe-spinner mx-auto mb-6" style="width:56px;height:56px;border-width:4px"></div>
          <h1 class="text-xl font-semibold text-slate-300">{{ t['subscription.verifyingPayment'] }}</h1>
          <p class="text-slate-500 mt-2 text-sm">{{ t['subscription.verifyingPaymentHint'] }}</p>
        </ng-container>

        <!-- Success -->
        <ng-container *ngIf="state === 'success'">
          <i class="material-icons text-6xl text-green-400 mb-4">check_circle</i>
          <h1 class="text-2xl font-bold text-slate-100 mb-3">{{ t['subscription.paymentSuccessful'] }}</h1>
        </ng-container>

        <!-- Processing (paid but webhook not yet confirmed — common in local dev) -->
        <ng-container *ngIf="state === 'processing'">
          <i class="material-icons text-6xl text-yellow-400 mb-4">schedule</i>
          <h1 class="text-2xl font-bold text-slate-100 mb-3">{{ t['subscription.paymentProcessing'] }}</h1>
          <p class="text-slate-400 mt-2 text-sm">{{ t['subscription.paymentProcessingHint'] }}</p>
        </ng-container>

        <!-- Failed -->
        <ng-container *ngIf="state === 'failed'">
          <i class="material-icons text-6xl text-red-400 mb-4">error</i>
          <h1 class="text-2xl font-bold text-slate-100 mb-3">{{ t['subscription.paymentFailed'] }}</h1>
        </ng-container>

        <button *ngIf="state !== 'loading'" (click)="goHome()"
          class="mt-6 px-8 py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-colors">
          {{ t['button.ok'] }}
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class SubscribeResultComponent implements OnInit, OnDestroy {
  state: 'loading' | 'success' | 'processing' | 'failed' = 'loading';
  readonly t = translations;

  private destroy$ = new Subject<void>();

  constructor(
    private readonly router: Router,
    private readonly subscriptionService: SubscriptionService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    let attempts = 0;

    // Load immediately, then poll every POLL_INTERVAL_MS
    this.subscriptionService.loadMySubscription().subscribe({
      next: (sub) => {
        if (sub?.status === 'active') {
          this.setState('success');
          return;
        }
        this.startPolling();
      },
      error: () => this.startPolling(),
    });
  }

  private startPolling(): void {
    let attempts = 0;

    interval(POLL_INTERVAL_MS).pipe(
      takeUntil(this.destroy$),
      switchMap(() => this.subscriptionService.loadMySubscription()),
    ).subscribe({
      next: (sub) => {
        attempts++;

        if (sub?.status === 'active') {
          this.setState('success');
          this.destroy$.next();
          return;
        }

        if (sub?.status === 'failed' || sub?.status === 'cancelled') {
          this.setState('failed');
          this.destroy$.next();
          return;
        }

        if (attempts >= POLL_MAX_ATTEMPTS) {
          // Payku confirmed the payment (urlreturn was called) but webhook hasn't
          // updated the DB yet — show processing rather than failed.
          this.setState('processing');
          this.destroy$.next();
        }
      },
      error: () => {
        if (attempts >= POLL_MAX_ATTEMPTS) {
          this.setState('failed');
          this.destroy$.next();
        }
      },
    });
  }

  private setState(state: typeof this.state): void {
    this.state = state;
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
