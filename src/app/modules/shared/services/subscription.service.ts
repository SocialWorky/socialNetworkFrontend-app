import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, Observable, Subject, takeUntil, tap } from 'rxjs';
import { Socket } from 'ngx-socket-io';
import { environment } from '@env/environment';

export interface SubscriptionPlan {
  _id: string;
  name: string;
  description?: string;
  priceClp: number;
  durationDays: number;
  features: string[];
  isActive: boolean;
}

export interface UserSubscription {
  _id: string;
  status: 'pending' | 'active' | 'expired' | 'cancelled' | 'failed';
  startedAt?: string;
  expiresAt?: string;
  priceAtSubscription: number;
  plan: SubscriptionPlan;
}

@Injectable({ providedIn: 'root' })
export class SubscriptionService implements OnDestroy {
  private readonly apiUrl = environment.API_URL;
  private readonly destroy$ = new Subject<void>();

  private subscriptionSubject = new BehaviorSubject<UserSubscription | null>(null);
  subscription$ = this.subscriptionSubject.asObservable();

  isPremium$ = this.subscription$.pipe(
    map((sub) => sub?.status === 'active' && sub.expiresAt != null && new Date(sub.expiresAt) > new Date()),
  );

  constructor(
    private readonly http: HttpClient,
    private readonly socket: Socket,
  ) {
    this.listenToSubscriptionEvents();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private listenToSubscriptionEvents(): void {
    this.socket.fromEvent('subscription:activated')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadMySubscription().subscribe());

    this.socket.fromEvent('subscription:expired')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.subscriptionSubject.next(null));

    this.socket.fromEvent('subscription:cancelled')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.subscriptionSubject.next(null));
  }

  loadMySubscription(): Observable<UserSubscription | null> {
    return this.http.get<UserSubscription | null>(`${this.apiUrl}/subscriptions/my`).pipe(
      tap((sub) => this.subscriptionSubject.next(sub)),
    );
  }

  getActivePlans(): Observable<SubscriptionPlan[]> {
    return this.http.get<SubscriptionPlan[]>(`${this.apiUrl}/subscription-plans`);
  }

  initiatePayment(planId: string): Observable<{ checkoutUrl: string; subscriptionId: string }> {
    return this.http.post<{ checkoutUrl: string; subscriptionId: string }>(
      `${this.apiUrl}/payments/initiate`,
      { planId },
    );
  }

  cancelSubscription(subscriptionId: string): Observable<UserSubscription> {
    return this.http
      .put<UserSubscription>(`${this.apiUrl}/subscriptions/${subscriptionId}/cancel`, {})
      .pipe(tap((sub) => this.subscriptionSubject.next(sub)));
  }

  setSubscription(sub: UserSubscription | null): void {
    this.subscriptionSubject.next(sub);
  }

  isPremiumSnapshot(): boolean {
    const sub = this.subscriptionSubject.value;
    return sub?.status === 'active' && sub.expiresAt != null && new Date(sub.expiresAt) > new Date();
  }
}
