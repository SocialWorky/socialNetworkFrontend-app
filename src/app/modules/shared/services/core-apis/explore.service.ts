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

  updateLocation(lat: number, lng: number, enabled: boolean): Observable<LocationStatus> {
    const body = enabled ? { enabled, lat, lng } : { enabled };
    return this.http
      .put<LocationStatus>(`${this.apiUrl}/explore/location`, body)
      .pipe(tap((status) => this._locationStatus$.next(status)));
  }

  disableDiscovery(): Observable<LocationStatus> {
    return this.updateLocation(0, 0, false);
  }

  getNearbyUsers(city?: string, country?: string): Observable<ExploreUser[]> {
    const params: Record<string, string> = {};
    if (city) params['city'] = city;
    if (country) params['country'] = country;
    return this.http
      .get<ExploreUser[]>(`${this.apiUrl}/explore/users`, { params })
      .pipe(
        tap((users) => this._nearbyUsers$.next(users)),
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
