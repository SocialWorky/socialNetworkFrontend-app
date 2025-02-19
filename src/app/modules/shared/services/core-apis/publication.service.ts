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

  // Crear una nueva publicación
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

  // Obtener una publicación por ID
  getPublicationId(id: string): Observable<PublicationView[]> {
    const url = `${this.baseUrl}/publications/${id}`;
    return this.http.get<PublicationView[]>(url);
  }

  // Eliminar una publicación
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

  // Contar el número total de publicaciones
  getCountPublications(): Observable<number> {
    const url = `${this.baseUrl}/publications/count`;
    return this.http.get<number>(url);
  }

  // Obtener todas las publicaciones
  getAllPublications(page: number, size: number, type: string = 'all', consultId: string = ''): Observable<Publication> {
    const url = `${this.baseUrl}/publications/all?page=${page}&pageSize=${size}&type=${type}&consultId=${consultId}`;
    return this.http.get<Publication>(url).pipe(
      catchError((error) => {
        console.error(error);
        return [];
      }),
      map((publicationsResponse: Publication) => {
        //this.publications.set(publicationsResponse.publications);
        return publicationsResponse;
      })
    );
  }

  // Actualizar una publicación por ID
  updatePublicationById(id: string, data: EditPublication): Observable<any> {
    const url = `${this.baseUrl}/publications/edit/${id}`;
    const response = this.http.put<any>(url, data).pipe(
      catchError(this.handleError)
    );
    this._notificationPublicationService.sendNotificationUpdatePublication(response);
    console.log('response update publication: ', response);
    return response;
  }

  // Actualizar las publicaciones activas
  updatePublications(newPublications: PublicationView[]): void {
    this._notificationPublicationService.sendNotificationUpdatePublication(newPublications);
  }

  // Actualizar las publicaciones eliminadas
  updatePublicationsDeleted(newPublications: PublicationView[]): void {
    this.publicationsDeleted.set(newPublications);
  }

  // Limpiar las publicaciones activas
  cleanPublications(): void {
    this.publications.set([]);
  }

}
