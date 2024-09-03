import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '@env/environment';
import { CreatePost } from '@shared/modules/addPublication/interfaces/createPost.interface';
import { Publication, PublicationView } from '@shared/interfaces/publicationView.interface';
import { BehaviorSubject, Observable } from 'rxjs';
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
  
  private token: string = localStorage.getItem('token') || '';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = this.token;
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  createPost(post: CreatePost): Observable<any> {
    const url = `${this.baseUrl}/publications/create`;
    const headers = this.getHeaders();
    return this.http.post(url, post, { headers });
  }

  getPublicationId(id: string): Observable<PublicationView[]> {
    const url = `${this.baseUrl}/publications/${id}`;
    const headers = this.getHeaders();
    return this.http.get<PublicationView[]>(url, { headers });
  }

  deletePublication(id: string): Observable<any> {
    const url = `${this.baseUrl}/publications/delete/${id}`;
    const headers = this.getHeaders();
    return this.http.delete(url, { headers });
  }

  getCountPublications(): Observable<number> {
    const url = `${this.baseUrl}/publications/count`;
    const headers = this.getHeaders();
    return this.http.get<number>(url, { headers });
  }

  private viewAll(page: number, size: number, type: string = 'all', consultId: string = ''): Observable<Publication> {
    const url = `${this.baseUrl}/publications/all?page=${page}&pageSize=${size}&type=${type}&consultId=${consultId}`;
    const headers = this.getHeaders();
    return this.http.get<Publication>(url, { headers });
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
