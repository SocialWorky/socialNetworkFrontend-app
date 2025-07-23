import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { catchError, map, Observable, Subject, throwError, from, of, switchMap, tap, forkJoin, firstValueFrom } from 'rxjs';

import { environment } from '@env/environment';
import { CreatePost } from '@shared/modules/addPublication/interfaces/createPost.interface';
import { EditPublication, Publication, PublicationView } from '@shared/interfaces/publicationView.interface';
import { NotificationPublicationService } from '@shared/services/notifications/notificationPublication.service';
import { PublicationDatabaseService } from '@shared/services/database/publication-database.service';

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
    private _publicationDatabase: PublicationDatabaseService,
  ) {
    this._publicationDatabase.initDatabase();
  }

  private handleError(error: any) {
    console.error('An error occurred', error);
    return throwError(() => new Error('Something went wrong; please try again later.'));
  }

  createPost(post: CreatePost): Observable<any> {
    const url = `${this.baseUrl}/publications/create`;
    return this.http.post(url, post).pipe(
      catchError(this.handleError),
      map((data: any) => {
        this._notificationPublicationService.sendNotificationNewPublication(data);
        // Verificar si data tiene la estructura correcta antes de guardar
        if (data && data.publications && data.publications._id) {
          this._publicationDatabase.addPublication(data.publications as PublicationView);
        } else if (data && data._id) {
          // If data is directly the publication
          this._publicationDatabase.addPublication(data as PublicationView);
        }
        return data;
      })
    );
  }

  getPublicationId(id: string): Observable<PublicationView[]> {
    const url = `${this.baseUrl}/publications/${id}`;
    return this.http.get<PublicationView[]>(url).pipe(
      tap((publications) => {
        publications.forEach(pub => this._publicationDatabase.addPublication(pub));
      })
    );
  }

  deletePublication(id: string): Observable<any> {
    const url = `${this.baseUrl}/publications/delete/${id}`;
    const response = this.http.delete(url).pipe(
      catchError(this.handleError),
      map((data) => {
        this._notificationPublicationService.sendNotificationDeletePublication(data);
        this._publicationDatabase.deletePublication(id);
        return data;
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
        if (publicationsResponse.publications) {
          this._publicationDatabase.addPublications(publicationsResponse.publications);
        }
        return publicationsResponse;
      })
    );
  }

  getLocalPublications(): Observable<PublicationView[]> {
    return from(this._publicationDatabase.getAllPublications());
  }

  getAllPublicationsWithCache(page: number, size: number, type: string = 'all', consultId: string = ''): Observable<Publication> {
    const url = `${this.baseUrl}/publications/all?page=${page}&pageSize=${size}&type=${type}&consultId=${consultId}`;
    
    return this.http.get<Publication>(url).pipe(
      catchError((error) => {
        console.error('Error fetching from server, using local cache:', error);
        return from(this._publicationDatabase.getAllPublications()).pipe(
          map((localPublications) => ({
            publications: localPublications,
            total: localPublications.length
          }))
        );
      }),
      map((publicationsResponse: Publication) => {
        if (publicationsResponse.publications) {
          this._publicationDatabase.addPublications(publicationsResponse.publications);
        }
        return publicationsResponse;
      })
    );
  }

  updatePublicationById(id: string, data: EditPublication): Observable<any> {
    const url = `${this.baseUrl}/publications/edit/${id}`;
    const response = this.http.put<any>(url, data).pipe(
      catchError(this.handleError),
      tap((updatedPublication) => {
        this._publicationDatabase.updatePublication(updatedPublication);
      })
    );
    this._notificationPublicationService.sendNotificationUpdatePublication(response);
    return response;
  }

  updatePublicationsLocal(newPublications: PublicationView[]): void {
    this._publicationDatabase.addPublications(newPublications);
  }

  updatePublications(newPublications: PublicationView[]): void {
    this._notificationPublicationService.sendNotificationUpdatePublication(newPublications);  
    this._publicationDatabase.addPublications(newPublications);
  }

  updatePublicationsDeleted(newPublications: PublicationView[]): void {
    this.publicationsDeleted.set(newPublications);
  }

  cleanPublications(): void {
    this.publications.set([]);
    this._publicationDatabase.clearAllPublications();
  }

  syncPublicationComments(publicationId: string, comments: any[]): void {
    this._publicationDatabase.getPublication(publicationId).then((publication) => {
      if (publication) {
        const hasChanges = JSON.stringify(publication.comment) !== JSON.stringify(comments);
        
        if (hasChanges) {
          publication.comment = comments;
          publication.updatedAt = new Date();
          this._publicationDatabase.updatePublication(publication);
        }
      }
    });
  }

  syncPublicationReactions(publicationId: string, reactions: any[]): void {
    this._publicationDatabase.getPublication(publicationId).then((publication) => {
      if (publication) {
        const hasChanges = JSON.stringify(publication.reaction) !== JSON.stringify(reactions);
        
        if (hasChanges) {
          publication.reaction = reactions;
          publication.updatedAt = new Date();
          this._publicationDatabase.updatePublication(publication);
        }
      }
    });
  }

  getAllPublicationsSmart(page: number, size: number, type: string = 'all', consultId: string = ''): Observable<Publication> {
    
    return from(this._publicationDatabase.getLocalPublicationsPaginated(page, size)).pipe(
      switchMap((localData) => {
        
        if (localData.publications.length > 0) {
          if (page === 1) {
            this.getTotalFromServer(type, consultId).then((serverTotal) => {
            });
          }
          
          return of({
            publications: localData.publications,
            total: localData.total
          });
        } else {
          return this.getAllPublicationsFromServer(page, size, type, consultId);
        }
      }),
      catchError((error) => {
        return this.getAllPublicationsFromServer(page, size, type, consultId);
      })
    );
  }

  private async getTotalFromServer(type: string, consultId: string): Promise<number> {
    try {
      const url = `${this.baseUrl}/publications/count?type=${type}&consultId=${consultId}`;
      const total = await firstValueFrom(this.http.get<number>(url));
      return total;
    } catch (error) {
      console.error('Error obteniendo total del servidor:', error);
      return 0;
    }
  }

  private getAllPublicationsFromServer(page: number, size: number, type: string = 'all', consultId: string = ''): Observable<Publication> {
    const url = `${this.baseUrl}/publications/all?page=${page}&pageSize=${size}&type=${type}&consultId=${consultId}`;
    
    return this.http.get<Publication>(url).pipe(
      catchError((error) => {
        console.error('Error fetching from server:', error);
        return of({ publications: [], total: 0 });
      }),
      tap((publicationsResponse: Publication) => {
        if (publicationsResponse.publications) {
          this._publicationDatabase.addPublications(publicationsResponse.publications);
        }
      })
    );
  }

  forceSyncPublications(page: number, size: number, type: string = 'all', consultId: string = ''): Observable<Publication> {
    return this.getAllPublicationsFromServer(page, size, type, consultId);
  }

  getOnlyLocalPublications(page: number, size: number): Observable<Publication> {
    return from(this._publicationDatabase.getLocalPublicationsPaginated(page, size));
  }

  syncSpecificPublication(publicationId: string): Observable<PublicationView | null> {
    const url = `${this.baseUrl}/publications/${publicationId}`;
    
    return this.http.get<PublicationView[]>(url).pipe(
      catchError((error) => {
        console.error('Error sincronizando publicación específica:', error);
        return of([]);
      }),
      map((publications) => {
        if (publications.length > 0) {
          const publication = publications[0];
          this._publicationDatabase.updatePublication(publication);
          return publication;
        }
        return null;
      })
    );
  }

  syncSpecificPublications(publicationIds: string[]): Observable<PublicationView[]> {
    if (publicationIds.length === 0) {
      return of([]);
    }

    const syncRequests = publicationIds.map(id => this.syncSpecificPublication(id));
    
    return forkJoin(syncRequests).pipe(
      map((results) => results.filter(pub => pub !== null) as PublicationView[])
    );
  }
}
