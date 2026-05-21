import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '@env/environment';
import { EmailTemplate } from '@admin/interfaces/email-template.interface';

@Injectable({ providedIn: 'root' })
export class EmailTemplateAdminService {
  private readonly baseUrl = `${environment.API_URL}/email-templates`;

  private _templates$ = new BehaviorSubject<EmailTemplate[]>([]);
  readonly templates$ = this._templates$.asObservable();

  constructor(private http: HttpClient) {}

  loadAll(): Observable<EmailTemplate[]> {
    return this.http.get<EmailTemplate[]>(this.baseUrl).pipe(
      tap((templates) => this._templates$.next(templates)),
    );
  }

  getByType(type: string): Observable<EmailTemplate> {
    return this.http.get<EmailTemplate>(`${this.baseUrl}/${type}`);
  }

  update(type: string, dto: Partial<EmailTemplate>): Observable<EmailTemplate> {
    return this.http.put<EmailTemplate>(`${this.baseUrl}/${type}`, dto).pipe(
      tap((updated) => {
        const current = this._templates$.getValue();
        this._templates$.next(current.map((t) => (t.type === updated.type ? updated : t)));
      }),
    );
  }

  resetToDefault(type: string): Observable<EmailTemplate> {
    return this.http.post<EmailTemplate>(`${this.baseUrl}/${type}/reset`, {}).pipe(
      tap((restored) => {
        const current = this._templates$.getValue();
        this._templates$.next(current.map((t) => (t.type === restored.type ? restored : t)));
      }),
    );
  }
}
