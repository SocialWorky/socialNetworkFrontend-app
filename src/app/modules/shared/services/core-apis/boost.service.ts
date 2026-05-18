import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '@env/environment';

export interface BoostPackage {
  _id: string;
  name: string;
  description?: string;
  priceClp: number;
  durationHours: number;
  isActive: boolean;
}

export interface PublicationBoostRecord {
  _id: string;
  publicationId: string;
  status: 'pending' | 'active' | 'expired' | 'failed';
  boostedUntil?: string;
  priceAtBoost: number;
  createdAt: string;
  package: BoostPackage;
}

@Injectable({ providedIn: 'root' })
export class BoostService {
  private readonly apiUrl = environment.API_URL;

  private packagesSubject = new BehaviorSubject<BoostPackage[]>([]);
  packages$ = this.packagesSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  getActivePackages(): Observable<BoostPackage[]> {
    return this.http.get<BoostPackage[]>(`${this.apiUrl}/boost-packages`).pipe(
      tap(pkgs => this.packagesSubject.next(pkgs)),
    );
  }

  initiateBoost(publicationId: string, packageId: string): Observable<{ checkoutUrl: string; boostId: string }> {
    return this.http.post<{ checkoutUrl: string; boostId: string }>(
      `${this.apiUrl}/boosts/initiate`,
      { publicationId, packageId },
    );
  }

  getMyBoosts(): Observable<PublicationBoostRecord[]> {
    return this.http.get<PublicationBoostRecord[]>(`${this.apiUrl}/boosts/my`);
  }

  isBoostActive(boostedUntil?: string | null): boolean {
    return !!boostedUntil && new Date(boostedUntil) > new Date();
  }

  formatPrice(priceClp: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(priceClp);
  }
}
