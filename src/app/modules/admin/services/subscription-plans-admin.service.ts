import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '@env/environment';

export interface SubscriptionPlan {
  _id: string;
  name: string;
  description?: string;
  priceClp: number;
  durationDays: number;
  features: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanDto {
  name: string;
  description?: string;
  priceClp: number;
  durationDays: number;
  features: string[];
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class SubscriptionPlansAdminService {
  private readonly apiUrl = `${environment.API_URL}/subscription-plans`;

  private plansSubject = new BehaviorSubject<SubscriptionPlan[]>([]);
  plans$ = this.plansSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  loadAll(): Observable<SubscriptionPlan[]> {
    this.loadingSubject.next(true);
    return this.http.get<SubscriptionPlan[]>(`${this.apiUrl}/all`).pipe(
      tap({
        next: (plans) => {
          this.plansSubject.next(plans);
          this.loadingSubject.next(false);
        },
        error: () => this.loadingSubject.next(false),
      }),
    );
  }

  create(dto: CreatePlanDto): Observable<SubscriptionPlan> {
    return this.http.post<SubscriptionPlan>(this.apiUrl, dto).pipe(
      tap((plan) => this.plansSubject.next([plan, ...this.plansSubject.value])),
    );
  }

  update(id: string, dto: Partial<CreatePlanDto>): Observable<SubscriptionPlan> {
    return this.http.put<SubscriptionPlan>(`${this.apiUrl}/${id}`, dto).pipe(
      tap((updated) => {
        const plans = this.plansSubject.value.map((p) => (p._id === id ? updated : p));
        this.plansSubject.next(plans);
      }),
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        const plans = this.plansSubject.value.filter((p) => p._id !== id);
        this.plansSubject.next(plans);
      }),
    );
  }
}
