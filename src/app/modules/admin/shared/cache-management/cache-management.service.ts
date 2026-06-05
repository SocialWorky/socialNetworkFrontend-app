import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '@env/environment';

export interface ClearDedupResponse {
  cleared: number;
  destination: string;
}

@Injectable({ providedIn: 'root' })
export class CacheManagementService {
  constructor(private http: HttpClient) {}

  clearDedupCache(destination?: string): Observable<ClearDedupResponse> {
    let params = new HttpParams();
    if (destination) {
      params = params.set('destination', destination);
    }
    return this.http.delete<ClearDedupResponse>(
      `${environment.APIFILESERVICE}upload/dedup-cache`,
      { params },
    );
  }
}
