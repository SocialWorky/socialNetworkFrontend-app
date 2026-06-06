import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '@env/environment';

export interface SocialEvent {
  _id: string;
  creatorId: string;
  title: string;
  description: string | null;
  date: string;
  locationType: 'physical' | 'virtual';
  location: string | null;
  price: number;
  maxTickets: number;
  ticketsSold: number;
  coverImage: string | null;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  ticketsAvailable?: number | null;
}

export interface Ticket {
  _id: string;
  eventId: string;
  userId: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  qrCode: string | null;
  priceAtPurchase: number;
  createdAt: string;
  event?: SocialEvent | null;
}

export interface CreateEventPayload {
  title: string;
  description?: string;
  date: string;
  locationType: 'physical' | 'virtual';
  location?: string;
  price: number;
  maxTickets: number;
  coverImage?: string;
}

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly apiUrl = environment.API_URL;

  private _events$ = new BehaviorSubject<SocialEvent[]>([]);
  readonly events$ = this._events$.asObservable();

  private _myEvents$ = new BehaviorSubject<SocialEvent[]>([]);
  readonly myEvents$ = this._myEvents$.asObservable();

  private _myTickets$ = new BehaviorSubject<Ticket[]>([]);
  readonly myTickets$ = this._myTickets$.asObservable();

  constructor(private readonly http: HttpClient) {}

  getEvents(type?: string, page: number = 1, pageSize: number = 20): Observable<{ events: SocialEvent[]; total: number }> {
    const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
    if (type) params['type'] = type;
    return this.http.get<{ events: SocialEvent[]; total: number }>(`${this.apiUrl}/events`, { params })
      .pipe(tap((res) => this._events$.next(res.events)));
  }

  getEvent(id: string): Observable<SocialEvent> {
    return this.http.get<SocialEvent>(`${this.apiUrl}/events/${id}`);
  }

  createEvent(payload: CreateEventPayload): Observable<SocialEvent> {
    return this.http.post<SocialEvent>(`${this.apiUrl}/events`, payload);
  }

  publishEvent(id: string): Observable<SocialEvent> {
    return this.http.put<SocialEvent>(`${this.apiUrl}/events/${id}/publish`, {});
  }

  updateEvent(id: string, payload: Partial<CreateEventPayload>): Observable<SocialEvent> {
    return this.http.put<SocialEvent>(`${this.apiUrl}/events/${id}`, payload);
  }

  cancelEvent(id: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/events/${id}/cancel`, {});
  }

  deleteEvent(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/events/${id}`);
  }

  getMyEvents(): Observable<SocialEvent[]> {
    return this.http.get<SocialEvent[]>(`${this.apiUrl}/events/mine`)
      .pipe(tap((events) => this._myEvents$.next(events)));
  }

  getAttendees(id: string): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.apiUrl}/events/${id}/attendees`);
  }

  registerTicket(eventId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/events/${eventId}/tickets`, {});
  }

  getMyTickets(): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.apiUrl}/tickets/mine`)
      .pipe(tap((tickets) => this._myTickets$.next(tickets)));
  }

  cancelTicket(ticketId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tickets/${ticketId}`);
  }

  formatPrice(price: number): string {
    return price === 0 ? 'Gratis' : `CLP ${price.toLocaleString('es-CL')}`;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-CL', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }
}
