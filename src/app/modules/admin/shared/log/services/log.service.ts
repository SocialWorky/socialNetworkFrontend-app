import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';
import { Logs } from '../interface/log.interface';

export interface LogStats {
  total: number;
  error: number;
  warn: number;
  info: number;
  debug: number;
}

export interface LogsResponse {
  logs: any[];
  total: number;
  filteredTotal: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LogService {

  urlApi = `${environment.API_URL}/records-logs`;

  constructor(
    private _http: HttpClient,
  ) { }

  getLogs(
    page: number = 1, 
    limit: number = 10, 
    level?: string, 
    search?: string,
    startDate?: string,
    endDate?: string,
    sortBy: string = 'timestamp',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Observable<LogsResponse> {
    
    let params: any = {
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
      sortOrder
    };

    if (level) params.level = level;
    if (search) params.search = search;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    // Add headers to prevent caching - logs should always be read directly from database
    const headers = new HttpHeaders({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    return this._http.get<LogsResponse>(this.urlApi, { 
      params,
      headers
    });
  }

  getLogStats(): Observable<LogStats> {
    // Add headers to prevent caching - stats should always be read directly from database
    const headers = new HttpHeaders({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    return this._http.get<LogStats>(`${this.urlApi}/stats`, { headers });
  }

  /**
   * Mark a log as resolved
   */
  markAsResolved(logId: string): Observable<{ message: string }> {
    const headers = new HttpHeaders({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    return this._http.patch<{ message: string }>(`${this.urlApi}/${logId}/resolve`, {}, { headers });
  }
}
