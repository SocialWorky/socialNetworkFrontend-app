import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '@env/environment';
import { CreatePost } from '@shared/modules/addPublication/interfaces/createPost.interface';
import { PublicationView } from '@shared/interfaces/publicationView.interface';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PublicationService {
  private publicationsSubject: BehaviorSubject<PublicationView[]> = new BehaviorSubject<PublicationView[]>([]);
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

  createPost(post: CreatePost) {
    const url = `${this.baseUrl}/publications/create`;
    const headers = this.getHeaders();
    return this.http.post(url, post, { headers });
  }

  getPublicationId(id: string): Observable<PublicationView[]> {
    const url = `${this.baseUrl}/publications/${id}`;
    const headers = this.getHeaders();
    return this.http.get<PublicationView[]>(url, { headers });
  }

  deletePublication(id: string) {
    const url = `${this.baseUrl}/publications/delete/${id}`;
    const headers = this.getHeaders();
    return this.http.delete(url, { headers });
  }

  getCountPublications(): Observable<number> {
    const url = `${this.baseUrl}/publications/count`;
    const headers = this.getHeaders();
    return this.http.get<number>(url, { headers });
  }

  private viewAll(page: number, size: number): Observable<PublicationView[]> {
    const url = `${this.baseUrl}/publications/all?page=${page}&pageSize=${size}&type=all`;
    const headers = this.getHeaders();
    return this.http.get<PublicationView[]>(url, { headers });
  }

  async getAllPublications(page: number, size: number): Promise<PublicationView[]> {
    try {
      const publications: PublicationView[] = await firstValueFrom(this.viewAll(page, size)) ?? [];
      this.publicationsSubject.next(publications);
      return publications;
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  updatePublications(newPublications: PublicationView[]): void {
    this.publicationsSubject.next(newPublications);
  }
}
