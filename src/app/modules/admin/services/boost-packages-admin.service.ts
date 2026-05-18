import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '@env/environment';

export interface BoostPackageDto {
  name: string;
  description?: string;
  priceClp: number;
  durationHours: number;
  isActive?: boolean;
}

export interface BoostPackage {
  _id: string;
  name: string;
  description?: string;
  priceClp: number;
  durationHours: number;
  isActive: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class BoostPackagesAdminService {
  private readonly apiUrl = `${environment.API_URL}/boost-packages`;

  private packagesSubject = new BehaviorSubject<BoostPackage[]>([]);
  packages$ = this.packagesSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  loadAll(): Observable<BoostPackage[]> {
    this.loadingSubject.next(true);
    return this.http.get<BoostPackage[]>(`${this.apiUrl}/all`).pipe(
      tap({
        next: (pkgs) => { this.packagesSubject.next(pkgs); this.loadingSubject.next(false); },
        error: () => this.loadingSubject.next(false),
      }),
    );
  }

  create(dto: BoostPackageDto): Observable<BoostPackage> {
    return this.http.post<BoostPackage>(this.apiUrl, dto).pipe(
      tap(pkg => this.packagesSubject.next([pkg, ...this.packagesSubject.value])),
    );
  }

  update(id: string, dto: Partial<BoostPackageDto>): Observable<BoostPackage> {
    return this.http.put<BoostPackage>(`${this.apiUrl}/${id}`, dto).pipe(
      tap(updated => {
        const pkgs = this.packagesSubject.value.map(p => p._id === id ? updated : p);
        this.packagesSubject.next(pkgs);
      }),
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.packagesSubject.next(this.packagesSubject.value.filter(p => p._id !== id))),
    );
  }
}
