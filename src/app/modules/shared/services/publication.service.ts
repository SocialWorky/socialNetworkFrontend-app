import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { environment } from '../../../../environments/environment';
import { CreatePost } from '../addPublication/interfaces/createPost.interface';
import { PublicationView } from '../interfaces/publicationView.interface';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PublicationService {

  publicationsSubject: BehaviorSubject<PublicationView[]> = new BehaviorSubject<PublicationView[]>([]);

  publications$: Observable<PublicationView[]> = this.publicationsSubject.asObservable();


  private baseUrl: string;
  private token: string;

  constructor(private http: HttpClient) {
    this.baseUrl = environment.API_URL;
    this.token = localStorage.getItem('token') || '';
  }

  private getHeaders(): HttpHeaders {
    const token = this.token;
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return headers;
  }

  createPost(post: CreatePost) {
    const url = `${this.baseUrl}/publications/create`;
    const headers = this.getHeaders();
    return this.http.post(url, post, { headers });
  }

  private viewAll(page: number, size: number): Observable<PublicationView[]> {
    const url = `${this.baseUrl}/publications/all?page=${page}&pageSize=${size}`;
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


}
