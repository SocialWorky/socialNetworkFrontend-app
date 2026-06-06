import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import { environment } from '@env/environment';

export interface ExploreUser {
  _id: string;
  username: string;
  name: string;
  lastName: string;
  avatar: string | null;
  discoveryCity: string | null;
  discoveryCountry: string | null;
  isPremium: boolean;
  isVerified: boolean;
  distanceKm: number;
}

export interface NearbyUsersResponse {
  users: ExploreUser[];
  total: number;
}

export interface NearbyUsersOptions {
  radiusKm?: number;
  page?: number;
  pageSize?: number;
  bypassCache?: boolean;
}

export interface LocationStatus {
  discoveryEnabled: boolean;
  city: string | null;
  country: string | null;
}

@Injectable({ providedIn: 'root' })
export class ExploreService {
  private readonly apiUrl = environment.API_URL;

  private _nearbyUsers$ = new BehaviorSubject<ExploreUser[]>([]);
  readonly nearbyUsers$ = this._nearbyUsers$.asObservable();

  private _locationStatus$ = new BehaviorSubject<LocationStatus>({
    discoveryEnabled: false,
    city: null,
    country: null,
  });
  readonly locationStatus$ = this._locationStatus$.asObservable();

  constructor(private readonly http: HttpClient) {}

  getLocationStatus(): Observable<LocationStatus> {
    return this.http
      .get<LocationStatus>(`${this.apiUrl}/explore/location`)
      .pipe(tap((status) => this._locationStatus$.next(status)));
  }

  updateLocation(lat: number, lng: number, enabled: boolean): Observable<LocationStatus> {
    const body = enabled ? { enabled, lat, lng } : { enabled };
    return this.http
      .put<LocationStatus>(`${this.apiUrl}/explore/location`, body)
      .pipe(tap((status) => this._locationStatus$.next(status)));
  }

  disableDiscovery(): Observable<LocationStatus> {
    return this.updateLocation(0, 0, false);
  }

  getNearbyUsers(opts: NearbyUsersOptions = {}): Observable<NearbyUsersResponse> {
    const params: Record<string, string> = {};
    if (opts.radiusKm != null) params['radiusKm'] = String(opts.radiusKm);
    if (opts.page != null) params['page'] = String(opts.page);
    if (opts.pageSize != null) params['pageSize'] = String(opts.pageSize);
    // Unique URL on demand busts the CacheInterceptor + DeduplicationInterceptor so the
    // sidebar poll re-queries the backend instead of replaying a stale cached response.
    if (opts.bypassCache) params['_t'] = String(Date.now());
    return this.http
      .get<NearbyUsersResponse>(`${this.apiUrl}/explore/users`, { params })
      .pipe(
        tap((res) => this._nearbyUsers$.next(res.users)),
        catchError(() => EMPTY),
      );
  }

  getNearbyPublications(city?: string, page: number = 1): Observable<any> {
    const params: Record<string, string> = { page: String(page) };
    if (city) params['city'] = city;
    return this.http.get<any>(`${this.apiUrl}/explore/publications/nearby`, { params }).pipe(
      catchError(() => EMPTY),
    );
  }
}
