import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface AdminSubscription {
  _id: string;
  userId: string;
  status: 'pending' | 'active' | 'expired' | 'cancelled' | 'failed';
  startedAt: string | null;
  expiresAt: string | null;
  priceAtSubscription: number;
  paykuTransactionId: string | null;
  createdAt: string;
  plan: {
    _id: string;
    name: string;
    priceClp: number;
    durationDays: number;
  };
  user: {
    username: string;
    email: string;
    name: string;
    avatar: string;
  } | null;
  latestPayment: {
    amount: number;
    status: string;
    paykuTransactionId: string | null;
    createdAt: string;
    paykuPayload: Record<string, any>;
  } | null;
}

export interface AdminSubscriptionListResponse {
  data: AdminSubscription[];
  total: number;
}

export interface UserSearchResult {
  _id: string;
  username: string;
  email: string;
  name: string;
  lastName: string;
  avatar: string;
}

@Injectable({ providedIn: 'root' })
export class SubscriptionsAdminService {
  private readonly apiUrl = `${environment.API_URL}/subscriptions/admin`;
  private readonly userApiUrl = `${environment.API_URL}/user`;

  constructor(private readonly http: HttpClient) {}

  list(page = 1, limit = 20, status?: string, search?: string): Observable<AdminSubscriptionListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    if (status) params = params.set('status', status);
    if (search) params = params.set('search', search);
    return this.http.get<AdminSubscriptionListResponse>(this.apiUrl, { params });
  }

  assign(userId: string, planId: string, note?: string): Observable<AdminSubscription> {
    return this.http.post<AdminSubscription>(`${this.apiUrl}/assign`, { userId, planId, note });
  }

  activate(subscriptionId: string): Observable<AdminSubscription> {
    return this.http.put<AdminSubscription>(`${this.apiUrl}/${subscriptionId}/activate`, {});
  }

  cancel(subscriptionId: string): Observable<AdminSubscription> {
    return this.http.put<AdminSubscription>(`${this.apiUrl}/${subscriptionId}/cancel`, {});
  }

  delete(subscriptionId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${subscriptionId}`);
  }

  changePlan(subscriptionId: string, planId: string, note?: string): Observable<AdminSubscription> {
    return this.http.put<AdminSubscription>(`${this.apiUrl}/${subscriptionId}/change-plan`, { planId, note });
  }

  searchUsers(query: string): Observable<UserSearchResult[]> {
    return this.http.get<UserSearchResult[]>(`${this.userApiUrl}/username/${encodeURIComponent(query)}`);
  }
}
