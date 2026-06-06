import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '@env/environment';

export interface CreatorProfile {
  _id: string;
  userId: string;
  monthlyPrice: number;
  description: string | null;
  benefits: string | null;
  isActive: boolean;
  subscriberCount?: number;
  isSubscribed?: boolean;
}

export interface CreatorStats {
  subscriberCount: number;
  monthlyRevenue: number;
  expiringThisWeek: number;
}

export interface CreatorSubscriptionItem {
  _id: string;
  subscriberId: string;
  creatorId: string;
  status: string;
  priceAtSubscription: number;
  expiresAt: string | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class CreatorProfileService {
  private readonly apiUrl = environment.API_URL;

  private _myProfile$ = new BehaviorSubject<CreatorProfile | null>(null);
  readonly myProfile$ = this._myProfile$.asObservable();

  private _myStats$ = new BehaviorSubject<CreatorStats | null>(null);
  readonly myStats$ = this._myStats$.asObservable();

  constructor(private readonly http: HttpClient) {}

  upsertProfile(dto: Partial<CreatorProfile>): Observable<CreatorProfile> {
    return this.http
      .put<CreatorProfile>(`${this.apiUrl}/creator-profile/me`, dto)
      .pipe(tap((p) => this._myProfile$.next(p)));
  }

  getPublicProfile(userId: string): Observable<CreatorProfile> {
    return this.http.get<CreatorProfile>(`${this.apiUrl}/creator-profile/${userId}`);
  }

  getMyStats(): Observable<CreatorStats> {
    return this.http
      .get<CreatorStats>(`${this.apiUrl}/creator-profile/me/stats`)
      .pipe(tap((s) => this._myStats$.next(s)));
  }

  initiateSubscription(creatorId: string): Observable<{ subscriptionId: string; checkoutUrl: string }> {
    return this.http.post<{ subscriptionId: string; checkoutUrl: string }>(
      `${this.apiUrl}/creator-subscriptions`,
      { creatorId },
    );
  }

  cancelSubscription(creatorId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/creator-subscriptions/${creatorId}`);
  }

  getMySubscriptions(): Observable<CreatorSubscriptionItem[]> {
    return this.http.get<CreatorSubscriptionItem[]>(`${this.apiUrl}/creator-subscriptions/mine`);
  }

  formatPrice(price: number): string {
    return `CLP ${price.toLocaleString('es-CL')}/mes`;
  }
}
