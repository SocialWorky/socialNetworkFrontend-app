import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { SubscriptionPlan, SubscriptionService, UserSubscription } from '@shared/services/subscription.service';
import { AlertService } from '@shared/services/alert.service';
import { Alerts } from '@shared/enums/alerts.enum';
import { translations } from '@translations/translations';

@Component({
  selector: 'worky-subscribe',
  templateUrl: './subscribe.component.html',
  styleUrls: ['./subscribe.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class SubscribeComponent implements OnInit, OnDestroy {
  plans: SubscriptionPlan[] = [];
  currentSubscription: UserSubscription | null = null;
  isLoading = true;
  initiatingPlanId: string | null = null;

  readonly t = translations;

  private destroy$ = new Subject<void>();

  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly alertService: AlertService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.subscriptionService.subscription$
      .pipe(takeUntil(this.destroy$))
      .subscribe((sub) => {
        this.currentSubscription = sub;
        this.cdr.markForCheck();
      });

    this.subscriptionService.loadMySubscription().pipe(takeUntil(this.destroy$)).subscribe();

    this.subscriptionService.getActivePlans().pipe(takeUntil(this.destroy$)).subscribe({
      next: (plans) => {
        this.plans = plans;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  subscribe(plan: SubscriptionPlan): void {
    this.initiatingPlanId = plan._id;
    this.cdr.markForCheck();

    this.subscriptionService.initiatePayment(plan._id).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ checkoutUrl }) => {
        if (!checkoutUrl || !checkoutUrl.startsWith('http')) {
          this.initiatingPlanId = null;
          this.cdr.markForCheck();
          this.alertService.showAlert(
            translations['subscription.paymentFailed'],
            translations['subscription.paymentServiceUnavailable'],
            Alerts.ERROR,
          );
          return;
        }
        window.location.href = checkoutUrl;
      },
      error: (err: any) => {
        this.initiatingPlanId = null;
        this.cdr.markForCheck();
        const serverMsg: string = err?.error?.message ?? '';
        const key = serverMsg.includes('pending')
          ? 'subscription.pendingSubscriptionError'
          : serverMsg.includes('not enabled') || err?.status === 503
            ? 'subscription.paymentServiceUnavailable'
            : 'subscription.paymentFailed';
        this.alertService.showAlert(
          translations['subscription.paymentFailed'],
          translations[key] ?? translations['subscription.paymentFailed'],
          Alerts.ERROR,
        );
      },
    });
  }

  cancelSubscription(): void {
    if (!this.currentSubscription) return;
    this.subscriptionService
      .cancelSubscription(this.currentSubscription._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: () => this.cdr.markForCheck() });
  }

  formatPrice(priceClp: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(priceClp);
  }

  isActive(): boolean {
    return (
      this.currentSubscription?.status === 'active' &&
      !!this.currentSubscription.expiresAt &&
      new Date(this.currentSubscription.expiresAt) > new Date()
    );
  }
}
