import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';
import { LogStats, Logs } from '../interface/log.interface';

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

export interface LogFilters {
  page?: number;
  limit?: number;
  level?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  source?: string;
  userId?: string;
  event?: string;
  method?: string;
  statusCode?: number;
  context?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LogService {

  urlApi = `${environment.API_URL}/records-logs`;

  private readonly noCache = new HttpHeaders({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });

  constructor(private _http: HttpClient) {}

  getLogs(filters: LogFilters = {}): Observable<LogsResponse> {
    const params: Record<string, string> = {
      page: String(filters.page ?? 1),
      limit: String(filters.limit ?? 10),
      sortBy: filters.sortBy ?? 'timestamp',
      sortOrder: filters.sortOrder ?? 'desc',
    };

    if (filters.level) params['level'] = filters.level;
    if (filters.search) params['search'] = filters.search;
    if (filters.startDate) params['startDate'] = filters.startDate;
    if (filters.endDate) params['endDate'] = filters.endDate;
    if (filters.source) params['source'] = filters.source;
    if (filters.userId) params['userId'] = filters.userId;
    if (filters.event) params['event'] = filters.event;
    if (filters.method) params['method'] = filters.method;
    if (filters.statusCode) params['statusCode'] = String(filters.statusCode);
    if (filters.context) params['context'] = filters.context;

    return this._http.get<LogsResponse>(this.urlApi, {
      params,
      headers: this.noCache,
    });
  }

  getLogStats(): Observable<LogStats> {
    return this._http.get<LogStats>(`${this.urlApi}/stats`, { headers: this.noCache });
  }

  markAsResolved(logId: string): Observable<{ message: string }> {
    return this._http.patch<{ message: string }>(
      `${this.urlApi}/${logId}/resolve`,
      {},
      { headers: this.noCache },
    );
  }

  deleteAllLogs(): Observable<{ deleted: number }> {
    return this._http.delete<{ deleted: number }>(
      `${this.urlApi}/all`,
      { headers: this.noCache },
    );
  }
}
