import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '@env/environment';
import { CreatePost } from '@shared/modules/addPublication/interfaces/createPost.interface';
import { EditPublication, Publication, PublicationView } from '@shared/interfaces/publicationView.interface';
import { LogService, LevelLogEnum } from './log.service';

@Injectable({
  providedIn: 'root'
})
export class PublicationDataService {
  private baseUrl: string = environment.API_URL;

  constructor(
    private http: HttpClient,
    private logService: LogService
  ) {}

  /**
   * Get publications from server
   */
  getAllPublicationsFromServer(
    page: number, 
    size: number, 
    type: string = 'all', 
    consultId: string = ''
  ): Observable<Publication> {
    const url = `${this.baseUrl}/publications/all?page=${page}&pageSize=${size}&type=${type}&consultId=${consultId}`;

    return this.http.get<Publication>(url).pipe(
      map(response => {
        this.logService.log(LevelLogEnum.INFO, 'PublicationDataService', 'Publications fetched from server', {
          page,
          size,
          type,
          consultId,
          count: response.publications?.length || 0
        });
        return response;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get publication by ID from server
   */
  getPublicationById(id: string): Observable<PublicationView[]> {
    const url = `${this.baseUrl}/publications/${id}`;
    
    return this.http.get<PublicationView[]>(url).pipe(
      map(response => {
        this.logService.log(LevelLogEnum.INFO, 'PublicationDataService', 'Publication fetched by ID', { id });
        return response;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Create new publication
   */
  createPost(post: CreatePost): Observable<any> {
    const url = `${this.baseUrl}/publications`;
    
    return this.http.post(url, post).pipe(
      map(response => {
        this.logService.log(LevelLogEnum.INFO, 'PublicationDataService', 'Publication created successfully', {
          publicationId: (response as any)._id
        });
        return response;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Update publication by ID
   */
  updatePublicationById(id: string, data: EditPublication): Observable<any> {
    const url = `${this.baseUrl}/publications/${id}`;
    
    return this.http.put(url, data).pipe(
      map(response => {
        this.logService.log(LevelLogEnum.INFO, 'PublicationDataService', 'Publication updated successfully', { id });
        return response;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Delete publication by ID
   */
  deletePublication(id: string): Observable<any> {
    const url = `${this.baseUrl}/publications/${id}`;
    
    return this.http.delete(url).pipe(
      map(response => {
        this.logService.log(LevelLogEnum.INFO, 'PublicationDataService', 'Publication deleted successfully', { id });
        return response;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get publication count
   */
  getCountPublications(): Observable<number> {
    const url = `${this.baseUrl}/publications/count`;
    
    return this.http.get<{ count: number }>(url).pipe(
      map(response => {
        this.logService.log(LevelLogEnum.INFO, 'PublicationDataService', 'Publication count fetched', { count: response.count });
        return response.count;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get total publications from server
   */
  async getTotalFromServer(type: string, consultId: string): Promise<number> {
    try {
      const url = `${this.baseUrl}/publications/count`;
      const params = { type, consultId };
      
      const response = await this.http.get<{ count: number }>(url, { params }).toPromise();
      return response?.count || 0;
    } catch (error) {
      this.logService.log(LevelLogEnum.ERROR, 'PublicationDataService', 'Error getting total from server', { error });
      return 0;
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: any) {
    console.error('PublicationDataService error:', error);
    return throwError(() => new Error('Something went wrong; please try again later.'));
  }
} 