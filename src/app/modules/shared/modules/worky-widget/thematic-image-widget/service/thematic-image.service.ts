import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface ThematicImage {
  id: number;
  name: string;
  imageUrl: string;
  redirectUrl?: string;
  daysOfWeek?: number[] | null;
  slideDuration: number;
  altText?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class ThematicImageService {
  private apiUrl = `${environment.API_URL}/thematic-images`;

  constructor(private http: HttpClient) {}

  getActiveForToday(): Observable<ThematicImage[]> {
    return this.http.get<ThematicImage[]>(`${this.apiUrl}/active-today`);
  }

  getAll(): Observable<ThematicImage[]> {
    return this.http.get<ThematicImage[]>(this.apiUrl);
  }

  getById(id: number): Observable<ThematicImage> {
    return this.http.get<ThematicImage>(`${this.apiUrl}/${id}`);
  }

  create(image: Partial<ThematicImage>): Observable<ThematicImage> {
    return this.http.post<ThematicImage>(this.apiUrl, image);
  }

  update(id: number, image: Partial<ThematicImage>): Observable<ThematicImage> {
    return this.http.patch<ThematicImage>(`${this.apiUrl}/${id}`, image);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  toggleActive(id: number): Observable<ThematicImage> {
    return this.http.patch<ThematicImage>(`${this.apiUrl}/${id}/toggle`, {});
  }
}
