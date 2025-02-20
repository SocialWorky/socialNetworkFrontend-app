import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { catchError, map, Observable, Subject, takeUntil, throwError } from 'rxjs';

import { environment } from '@env/environment';
import { CreatePost } from '@shared/modules/addPublication/interfaces/createPost.interface';
import { EditPublication, Publication, PublicationView } from '@shared/interfaces/publicationView.interface';
import { NotificationPublicationService } from '@shared/services/notifications/notificationPublication.service';

@Injectable({
  providedIn: 'root',
})
export class PublicationService {
  private baseUrl: string = environment.API_URL;

  private publications = signal<PublicationView[]>([]);

  private publicationsDeleted = signal<PublicationView[]>([]);

  private destroy$ = new Subject<void>();

  getPublications() {
    return this.publications;
  }

  getDeletedPublications() {
    return this.publicationsDeleted;
  }

  constructor(
    private http: HttpClient,
    private _notificationPublicationService: NotificationPublicationService,
  ) {}

  private handleError(error: any) {
    console.error('An error occurred', error);
    return throwError(() => new Error('Something went wrong; please try again later.'));
  }

  createPost(post: CreatePost): Observable<any> {
    const url = `${this.baseUrl}/publications/create`;
    return this.http.post(url, post).pipe(
      catchError(this.handleError),
      map((data) => {
        this._notificationPublicationService.sendNotificationNewPublication(data);
        return data;
      })
    );
  }

  getPublicationId(id: string): Observable<PublicationView[]> {
    const url = `${this.baseUrl}/publications/${id}`;
    return this.http.get<PublicationView[]>(url);
  }

  deletePublication(id: string): Observable<any> {
    const url = `${this.baseUrl}/publications/delete/${id}`;
    const response = this.http.delete(url).pipe(
      catchError(this.handleError),
      map((data) => {
        this._notificationPublicationService.sendNotificationDeletePublication(data);
        return data
      })
    );

    return response;
  }

  getCountPublications(): Observable<number> {
    const url = `${this.baseUrl}/publications/count`;
    return this.http.get<number>(url);
  }

  getAllPublications(page: number, size: number, type: string = 'all', consultId: string = ''): Observable<Publication> {
    const url = `${this.baseUrl}/publications/all?page=${page}&pageSize=${size}&type=${type}&consultId=${consultId}`;
    return this.http.get<Publication>(url).pipe(
      catchError((error) => {
        console.error(error);
        return [];
      }),
      map((publicationsResponse: Publication) => {
        return publicationsResponse;
      })
    );
  }

  updatePublicationById(id: string, data: EditPublication): Observable<any> {
    const url = `${this.baseUrl}/publications/edit/${id}`;
    const response = this.http.put<any>(url, data).pipe(
      catchError(this.handleError)
    );
    this._notificationPublicationService.sendNotificationUpdatePublication(response);
    return response;
  }

  updatePublications(newPublications: PublicationView[]): void {
    this._notificationPublicationService.sendNotificationUpdatePublication(newPublications);
  }

  updatePublicationsDeleted(newPublications: PublicationView[]): void {
    this.publicationsDeleted.set(newPublications);
  }

  cleanPublications(): void {
    this.publications.set([]);
  }

}
