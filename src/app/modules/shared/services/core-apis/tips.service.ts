import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '@env/environment';

export interface Tip {
  tipId: string;
  senderId: string;
  recipientId: string;
  amount: number;
  message: string | null;
  status: string;
  senderName: string | null;
  senderAvatar: string | null;
  recipientName: string | null;
  recipientAvatar: string | null;
  createdAt: string;
}

export interface TipsPage {
  tips: Tip[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class TipsService {
  private readonly apiUrl = environment.API_URL;

  private _receivedTips$ = new BehaviorSubject<Tip[]>([]);
  readonly receivedTips$ = this._receivedTips$.asObservable();

  private _sentTips$ = new BehaviorSubject<Tip[]>([]);
  readonly sentTips$ = this._sentTips$.asObservable();

  constructor(private readonly http: HttpClient) {}

  initiateTip(
    recipientId: string,
    amount: number,
    message?: string,
  ): Observable<{ tipId: string; checkoutUrl: string }> {
    return this.http.post<{ tipId: string; checkoutUrl: string }>(
      `${this.apiUrl}/tips`,
      { recipientId, amount, ...(message ? { message } : {}) },
    );
  }

  getReceived(page: number = 1, pageSize: number = 20): Observable<TipsPage> {
    return this.http
      .get<TipsPage>(`${this.apiUrl}/tips/received`, { params: { page: String(page), pageSize: String(pageSize) } })
      .pipe(tap((res) => this._receivedTips$.next(res.tips)));
  }

  getSent(page: number = 1, pageSize: number = 20): Observable<TipsPage> {
    return this.http
      .get<TipsPage>(`${this.apiUrl}/tips/sent`, { params: { page: String(page), pageSize: String(pageSize) } })
      .pipe(tap((res) => this._sentTips$.next(res.tips)));
  }

  formatAmount(amount: number): string {
    return `CLP ${amount.toLocaleString('es-CL')}`;
  }
}
