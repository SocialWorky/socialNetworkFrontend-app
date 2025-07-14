import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';
import { Webhook, CreateWebhook, UpdateWebhook, ToggleWebhook } from '../interface/webhook.interface';

@Injectable({
  providedIn: 'root'
})
export class WebhookService {

  urlApi = `${environment.API_URL}/webhooks`;

  constructor(
    private _http: HttpClient,
  ) { }

  registerWebhook(data: CreateWebhook): Observable<Webhook> {
    return this._http.post<Webhook>(`${this.urlApi}/register`, data);
  }

  getAllWebhooks(): Observable<Webhook[]> {
    return this._http.get<Webhook[]>(`${this.urlApi}`);
  }

  deleteWebhook(id: string): Observable<{ message: string }> {
    return this._http.delete<{ message: string }>(`${this.urlApi}/${id}`);
  }

  toggleWebhook(id: string, data: ToggleWebhook): Observable<{ message: string }> {
    return this._http.put<{ message: string }>(`${this.urlApi}/${id}/toggle-active`, data);
  }

  editWebhook(id: string, data: UpdateWebhook): Observable<{ message: string }> {
    return this._http.put<{ message: string }>(`${this.urlApi}/${id}`, data);
  }
}
