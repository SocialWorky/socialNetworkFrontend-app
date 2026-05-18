import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';
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
export class SubscriptionService {
  private readonly apiUrl = environment.API_URL;

  private subscriptionSubject = new BehaviorSubject<UserSubscription | null>(null);
  subscription$ = this.subscriptionSubject.asObservable();

  isPremium$ = this.subscription$.pipe(
    map((sub) => sub?.status === 'active' && sub.expiresAt != null && new Date(sub.expiresAt) > new Date()),
  );

  constructor(private readonly http: HttpClient) {}

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
