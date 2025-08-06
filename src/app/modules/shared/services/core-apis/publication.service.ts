import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { catchError, map, Observable, Subject, throwError, from, of, switchMap, tap, forkJoin, firstValueFrom, filter, shareReplay } from 'rxjs';

import { environment } from '@env/environment';
import { CreatePost } from '@shared/modules/addPublication/interfaces/createPost.interface';
import { EditPublication, Publication, PublicationView } from '@shared/interfaces/publicationView.interface';
import { NotificationPublicationService } from '@shared/services/notifications/notificationPublication.service';
import { PublicationDatabaseService } from '@shared/services/database/publication-database.service';
import { LogService, LevelLogEnum } from './log.service';

@Injectable({
  providedIn: 'root',
})
export class PublicationService {
  private baseUrl: string = environment.API_URL;

  private publications = signal<PublicationView[]>([]);
  private publicationsDeleted = signal<PublicationView[]>([]);
  private destroy$ = new Subject<void>();

  // Cache para publicaciones individuales
  private publicationCache = new Map<string, { publication: PublicationView; timestamp: number }>();
  private readonly PUBLICATION_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
  private readonly MAX_PUBLICATION_CACHE_SIZE = 50;

  // Cache for publication lists
  private publicationListCache = new Map<string, { publications: PublicationView[]; timestamp: number }>();
  private readonly LIST_CACHE_DURATION = 1 * 60 * 1000; // 1 minute

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
    private logService: LogService,
  ) {
    this._publicationDatabase.initDatabase();
    // Clean expired cache every 5 minutes
    setInterval(() => this.cleanExpiredCache(), 5 * 60 * 1000);
  }

  /**
   * Sort publications by fixed status first, then by creation date (newest first)
   */
  private sortPublicationsByFixedAndDate(publications: PublicationView[]): PublicationView[] {
    return publications.sort((a, b) => {
      // First priority: fixed publications come first
      if (a.fixed && !b.fixed) return -1;
      if (!a.fixed && b.fixed) return 1;
      
      // Second priority: date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  /**
   * Public method to sort publications by fixed status and date
   * Used by components to reorder publications when fixed status changes
   */
  sortPublicationsByFixedAndDatePublic(publications: PublicationView[]): PublicationView[] {
    return this.sortPublicationsByFixedAndDate(publications);
  }

  private handleError(error: any) {
    console.error('An error occurred', error);
    return throwError(() => new Error('Something went wrong; please try again later.'));
  }

  /**
   * Unified method to get publications with intelligent cache
   */
  getAllPublications(
    page: number, 
    size: number, 
    type: string = 'all', 
    consultId: string = '',
    useCache: boolean = true
  ): Observable<Publication> {
    const cacheKey = `publications_${page}_${size}_${type}_${consultId}`;
    
    // Check cache if enabled
    if (useCache) {
      const cached = this.publicationListCache.get(cacheKey);
      if (cached && this.isCacheValid(cached.timestamp, this.LIST_CACHE_DURATION)) {
        return of({
          publications: cached.publications,
          total: cached.publications.length
        });
      }
    }

    // If not in cache or expired, use most efficient method
    return this.getAllPublicationsOptimized(page, size, type, consultId).pipe(
      tap(response => {
        if (useCache && response.publications) {
          this.addToPublicationListCache(cacheKey, response.publications);
        }
      })
    );
  }

  /**
   * Optimized method that combines logic from all previous methods
   */
  private getAllPublicationsOptimized(
    page: number, 
    size: number, 
    type: string = 'all', 
    consultId: string = ''
  ): Observable<Publication> {
    return from(this._publicationDatabase.getLocalPublicationsPaginated(page, size)).pipe(
      switchMap((localData) => {
        if (localData.publications.length > 0) {
          // Return local data immediately
          const localResult = {
            publications: localData.publications,
            total: localData.total
          };

          // Sync in background only if first page
          if (page === 1) {
            this.syncPublicationsInBackground(type, consultId).subscribe({
              next: (syncResult) => {
                if (syncResult.hasChanges) {
                  this.publications.set(syncResult.updatedPublications);
                }
              },
              error: (error) => {
                this.logService.log(LevelLogEnum.ERROR, 'PublicationService', 'Error in background synchronization', { error });
              }
            });
          }
          
          return of(localResult);
        } else {
          // If no local data, load from server
          return this.getAllPublicationsFromServer(page, size, type, consultId);
        }
      }),
      catchError((error) => {
        this.logService.log(LevelLogEnum.ERROR, 'PublicationService', 'Error in intelligent synchronization', { error });
        return this.getAllPublicationsFromServer(page, size, type, consultId);
      })
    );
  }

  /**
   * Get publication by ID with optimized cache
   */
  getPublicationId(id: string): Observable<PublicationView[]> {
    // Check cache first
    const cached = this.publicationCache.get(id);
    if (cached && this.isCacheValid(cached.timestamp, this.PUBLICATION_CACHE_DURATION)) {
      return of([cached.publication]);
    }

    const url = `${this.baseUrl}/publications/${id}`;
    return this.http.get<PublicationView[]>(url).pipe(
      tap((publications) => {
        publications.forEach(pub => {
          this._publicationDatabase.addPublication(pub);
          this.addToPublicationCache(pub._id, pub);
        });
      }),
      shareReplay(1) // Share response between multiple subscribers
    );
  }

  /**
   * Update publication without additional server call
   */
  updatePublicationById(id: string, data: EditPublication): Observable<any> {
    const url = `${this.baseUrl}/publications/edit/${id}`;
    return this.http.put<any>(url, data).pipe(
      catchError(this.handleError),
      tap((response) => {
        // Update local cache directly
        this.updateLocalPublication(id, data);
        // Send notification with updated data
        this._notificationPublicationService.sendNotificationUpdatePublication([response]);
      })
    );
  }

  /**
   * Update publication in local cache
   */
  private updateLocalPublication(id: string, data: EditPublication): void {
    const cached = this.publicationCache.get(id);
    if (cached) {
      const updatedPublication = { ...cached.publication, ...data };
      this.addToPublicationCache(id, updatedPublication);
      this._publicationDatabase.updatePublication(updatedPublication);
    }
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
          this.addToPublicationCache(data.publications._id, data.publications as PublicationView);
        } else if (data && data._id) {
          // If data is directly the publication
          this._publicationDatabase.addPublication(data as PublicationView);
          this.addToPublicationCache(data._id, data as PublicationView);
        }
        return data;
      })
    );
  }

  deletePublication(id: string): Observable<any> {
    const url = `${this.baseUrl}/publications/delete/${id}`;
    return this.http.delete(url).pipe(
      catchError(this.handleError),
      map((data) => {
        this._notificationPublicationService.sendNotificationDeletePublication({ _id: id });
        this._publicationDatabase.deletePublication(id);
        this.publicationCache.delete(id); // Limpiar cache
        return data;
      })
    );
  }

  getCountPublications(): Observable<number> {
    const url = `${this.baseUrl}/publications/count`;
    return this.http.get<number>(url).pipe(
      catchError(this.handleError)
    );
  }

  getLocalPublications(): Observable<PublicationView[]> {
    return from(this._publicationDatabase.getAllPublications());
  }

  // Métodos legacy mantenidos para compatibilidad
  getAllPublicationsWithCache(page: number, size: number, type: string = 'all', consultId: string = ''): Observable<Publication> {
    return this.getAllPublications(page, size, type, consultId, true);
  }

  getAllPublicationsSmart(page: number, size: number, type: string = 'all', consultId: string = ''): Observable<Publication> {
    return this.getAllPublications(page, size, type, consultId, true);
  }

  getAllPublicationsWithSmartSync(page: number, size: number, type: string = 'all', consultId: string = ''): Observable<Publication> {
    return this.getAllPublications(page, size, type, consultId, true);
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
    this.clearAllCache();
  }

  syncPublicationComments(publicationId: string, comments: any[]): void {
    this._publicationDatabase.getPublication(publicationId).then((publication) => {
      if (publication) {
        const hasChanges = JSON.stringify(publication.comment) !== JSON.stringify(comments);
        
        if (hasChanges) {
          publication.comment = comments;
          publication.updatedAt = new Date();
          this._publicationDatabase.updatePublication(publication);
          this.addToPublicationCache(publicationId, publication);
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
          this.addToPublicationCache(publicationId, publication);
        }
      }
    });
  }

  /**
   * Sync publications in background without blocking UI
   */
  private syncPublicationsInBackground(type: string = 'all', consultId: string = ''): Observable<{
    hasChanges: boolean;
    updatedPublications: PublicationView[];
    newPublications: PublicationView[];
    updatedCount: number;
  }> {
    const url = `${this.baseUrl}/publications/all?page=1&pageSize=50&type=${type}&consultId=${consultId}`;
    
    return this.http.get<Publication>(url).pipe(
      switchMap((serverResponse) => {
        if (!serverResponse.publications || serverResponse.publications.length === 0) {
          return of({ hasChanges: false, updatedPublications: [], newPublications: [], updatedCount: 0 });
        }

        return from(this._publicationDatabase.updatePublicationsIfChanged(serverResponse.publications)).pipe(
          map((syncResult) => {
            const hasChanges = syncResult.new.length > 0 || syncResult.updated.length > 0;
            
            if (hasChanges) {
              // Get all updated publications
              return from(this._publicationDatabase.getAllPublications()).pipe(
                map((allPublications) => ({
                  hasChanges: true,
                  updatedPublications: allPublications,
                  newPublications: syncResult.new,
                  updatedCount: syncResult.new.length + syncResult.updated.length
                }))
              );
            } else {
              return of({ hasChanges: false, updatedPublications: [], newPublications: [], updatedCount: 0 });
            }
          }),
          switchMap(result => result)
        );
      }),
      catchError((error) => {
        this.logService.log(LevelLogEnum.ERROR, 'PublicationService', 'Error in background synchronization', { error });
        return of({ hasChanges: false, updatedPublications: [], newPublications: [], updatedCount: 0 });
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
          this.addToPublicationCache(publication._id, publication);
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

  private async getTotalFromServer(type: string, consultId: string): Promise<number> {
    try {
      const url = `${this.baseUrl}/publications/count?type=${type}&consultId=${consultId}`;
      const total = await firstValueFrom(this.http.get<number>(url));
      return total;
    } catch (error) {
      this.logService.log(LevelLogEnum.ERROR, 'PublicationService', 'Error getting total from server', { error });
      return 0;
    }
  }

  private getAllPublicationsFromServer(page: number, size: number, type: string = 'all', consultId: string = ''): Observable<Publication> {
    const url = `${this.baseUrl}/publications/all?page=${page}&pageSize=${size}&type=${type}&consultId=${consultId}`;
    
    return this.http.get<Publication>(url).pipe(
      catchError((error) => {
        this.logService.log(LevelLogEnum.ERROR, 'PublicationService', 'Error fetching from server', { error });
        return of({ publications: [], total: 0 });
      }),
      tap((publicationsResponse: Publication) => {
        if (publicationsResponse.publications) {
          const sortedPublications = this.sortPublicationsByFixedAndDate(publicationsResponse.publications);
          this._publicationDatabase.addPublications(sortedPublications);
          // Cache individual publications
          sortedPublications.forEach(pub => this.addToPublicationCache(pub._id, pub));
        }
      })
    );
  }

  // Cache methods
  private addToPublicationCache(id: string, publication: PublicationView): void {
    if (this.publicationCache.size >= this.MAX_PUBLICATION_CACHE_SIZE) {
      const oldestKey = this.publicationCache.keys().next().value;
      this.publicationCache.delete(oldestKey);
    }

    this.publicationCache.set(id, {
      publication,
      timestamp: Date.now()
    });
  }

  private addToPublicationListCache(key: string, publications: PublicationView[]): void {
    if (this.publicationListCache.size >= 20) { // Maximum 20 lists in cache
      const oldestKey = this.publicationListCache.keys().next().value;
      this.publicationListCache.delete(oldestKey);
    }

    this.publicationListCache.set(key, {
      publications,
      timestamp: Date.now()
    });
  }

  private isCacheValid(timestamp: number, duration: number): boolean {
    return Date.now() - timestamp < duration;
  }

  private cleanExpiredCache(): void {
    const now = Date.now();
    
    // Clean individual publications cache
    for (const [key, cached] of this.publicationCache.entries()) {
      if (!this.isCacheValid(cached.timestamp, this.PUBLICATION_CACHE_DURATION)) {
        this.publicationCache.delete(key);
      }
    }

    // Clean lists cache
    for (const [key, cached] of this.publicationListCache.entries()) {
      if (!this.isCacheValid(cached.timestamp, this.LIST_CACHE_DURATION)) {
        this.publicationListCache.delete(key);
      }
    }
  }

  private clearAllCache(): void {
    this.publicationCache.clear();
    this.publicationListCache.clear();
  }

  /**
   * Obtiene estadísticas del cache
   */
  getCacheStats(): { 
    individualCacheSize: number; 
    listCacheSize: number; 
    maxIndividualCache: number; 
    maxListCache: number; 
  } {
    return {
      individualCacheSize: this.publicationCache.size,
      listCacheSize: this.publicationListCache.size,
      maxIndividualCache: this.MAX_PUBLICATION_CACHE_SIZE,
      maxListCache: 20
    };
  }

  /**
   * Updates a publication in the local database (IndexedDB) with new media data
   * This ensures consistency between UI and local storage when media processing completes
   */
  async updatePublicationInLocalDatabase(publicationId: string, updateData: { media: any[]; containsMedia: boolean }): Promise<void> {
    try {
      // Update the publication in IndexedDB
      await this._publicationDatabase.updatePublicationMedia(publicationId, updateData.media, updateData.containsMedia);
      
      // Update the cache with the new data
      const cachedPublication = this.publicationCache.get(publicationId);
      if (cachedPublication) {
        cachedPublication.publication.media = updateData.media;
        cachedPublication.publication.containsMedia = updateData.containsMedia;
        cachedPublication.timestamp = Date.now();
      }
    } catch (error) {
      throw error;
    }
  }
}
