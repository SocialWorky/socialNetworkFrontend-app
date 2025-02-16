import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { CreatePost } from '@shared/modules/addPublication/interfaces/createPost.interface';
import { EditPublication, Publication, PublicationView } from '@shared/interfaces/publicationView.interface';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { distinctUntilChanged, catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PublicationService {
  private publicationsSubject: BehaviorSubject<PublicationView[]> = new BehaviorSubject<PublicationView[]>([]);
  
  private publicationsSubjectDeleted: BehaviorSubject<PublicationView[]> = new BehaviorSubject<PublicationView[]>([]);
  
  public publicationsDeleted$: Observable<PublicationView[]> = this.publicationsSubjectDeleted.asObservable().pipe(distinctUntilChanged());
  
  public publications$: Observable<PublicationView[]> = this.publicationsSubject.asObservable().pipe(distinctUntilChanged());
  
  private baseUrl: string = environment.API_URL;

  constructor(private http: HttpClient) {}

  private handleError(error: any) {
    console.error('An error occurred', error);
    return throwError(() => new Error('Something went wrong; please try again later.'));
  }

  createPost(post: CreatePost): Observable<any> {
    const url = `${this.baseUrl}/publications/create`;
    return this.http.post(url, post);
  }

  getPublicationId(id: string): Observable<PublicationView[]> {
    const url = `${this.baseUrl}/publications/${id}`;
    return this.http.get<PublicationView[]>(url);
  }

  deletePublication(id: string): Observable<any> {
    const url = `${this.baseUrl}/publications/delete/${id}`;
    return this.http.delete(url);
  }

  getCountPublications(): Observable<number> {
    const url = `${this.baseUrl}/publications/count`;
    return this.http.get<number>(url);
  }

  private viewAll(page: number, size: number, type: string = 'all', consultId: string = ''): Observable<Publication> {
    const url = `${this.baseUrl}/publications/all?page=${page}&pageSize=${size}&type=${type}&consultId=${consultId}`;
    return this.http.get<Publication>(url);
  }

  getAllPublications(page: number, size: number, type?: string, consultId?: string): Observable<Publication> {
    return this.viewAll(page, size, type, consultId).pipe(
      catchError((error) => {
        console.error(error);
        return [];
      }),
      map((publications: Publication) => {
        this.publicationsSubject.next(publications.publications);
        return publications;
      })
    );
  }

  updatePublicationById(id: string, data: EditPublication): Observable<any> {
    const url = `${this.baseUrl}/publications/edit/${id}`;
    return this.http.put<any>(url, data).pipe(
      catchError(this.handleError)
    );
  }

  updatePublications(newPublications: PublicationView[]): void {
    this.publicationsSubject.next(newPublications);
  }

  updatePublicationsDeleted(newPublications: PublicationView[]): void {
    this.publicationsSubjectDeleted.next(newPublications);
  }

  cleanPublication(): void {
    this.publicationsSubject.next([]);
  }

  getPublications(): PublicationView[] {
    return this.publicationsSubject.getValue();
  }
}
