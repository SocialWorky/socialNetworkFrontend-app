import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import { environment } from '@env/environment';

export interface ReactionCount {
  type: string;
  count: number;
}

export interface PublicationStats {
  publicationId: string;
  views: number;
  reactions: ReactionCount[];
  comments: number;
  engagementRate: number;
}

export interface PeriodCount {
  last7Days: number;
  last30Days: number;
}

export interface ProfileStats {
  profileVisits: PeriodCount;
  friendsGained: PeriodCount;
  totalPublications: number;
  totalReactions: number;
}

export interface AdminOverview {
  activeUsersToday: number;
  publicationsToday: number;
  activeSubscriptions: number;
  estimatedMonthlyRevenue: number;
  updatedAt: string;
  totalUsers: number;
  activeUsers: number;
  pendingVerificationUsers: number;
  newUsersThisWeek: number;
  totalPublications: number;
  publicationsWithMedia: number;
  totalComments: number;
  commentsToday: number;
  totalReactions: number;
  reactionsToday: number;
  pendingReports: number;
  resolvedReports: number;
  todayReports: number;
  publicationsThisWeek: number;
  publicationsLastWeek: number;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly apiUrl = environment.API_URL;

  private _publicationStats$ = new BehaviorSubject<PublicationStats | null>(null);
  readonly publicationStats$ = this._publicationStats$.asObservable();

  private _profileStats$ = new BehaviorSubject<ProfileStats | null>(null);
  readonly profileStats$ = this._profileStats$.asObservable();

  private _adminOverview$ = new BehaviorSubject<AdminOverview | null>(null);
  readonly adminOverview$ = this._adminOverview$.asObservable();

  constructor(private readonly http: HttpClient) {}

  registerPublicationView(publicationId: string): Observable<{ registered: boolean }> {
    return this.http
      .post<{ registered: boolean }>(`${this.apiUrl}/analytics/publication/${publicationId}/view`, {})
      .pipe(catchError(() => EMPTY));
  }

  getPublicationStats(publicationId: string): Observable<PublicationStats> {
    return this.http
      .get<PublicationStats>(`${this.apiUrl}/analytics/publication/${publicationId}`)
      .pipe(tap((stats) => this._publicationStats$.next(stats)));
  }

  registerProfileVisit(userId: string): Observable<{ registered: boolean }> {
    return this.http
      .post<{ registered: boolean }>(`${this.apiUrl}/analytics/profile/${userId}/visit`, {})
      .pipe(catchError(() => EMPTY));
  }

  getProfileStats(): Observable<ProfileStats> {
    return this.http
      .get<ProfileStats>(`${this.apiUrl}/analytics/profile`)
      .pipe(tap((stats) => this._profileStats$.next(stats)));
  }

  getAdminOverview(): Observable<AdminOverview> {
    return this.http
      .get<AdminOverview>(`${this.apiUrl}/analytics/admin/overview`, {
        headers: { 'Cache-Control': 'no-cache' },
      })
      .pipe(tap((overview) => this._adminOverview$.next(overview)));
  }
}
