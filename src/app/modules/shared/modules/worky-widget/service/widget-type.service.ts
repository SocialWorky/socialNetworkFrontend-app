import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface WidgetField {
  id?: number;
  key: string;
  label: string;
  fieldType: 'text' | 'textarea' | 'number' | 'url' | 'image' | 'color' | 'select' | 'checkbox' | 'date' | 'html';
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  order?: number;
}

export interface WidgetType {
  id?: number;
  name: string;
  description: string;
  type: 'html' | 'image' | 'text' | 'list' | 'link' | 'iframe' | 'custom';
  icon?: string;
  defaultConfig?: Record<string, any>;
  isActive?: boolean;
  fields?: WidgetField[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateWidgetTypeDto {
  name: string;
  description: string;
  type: string;
  icon?: string;
  defaultConfig?: Record<string, any>;
  isActive?: boolean;
  fields?: CreateWidgetFieldDto[];
}

export interface CreateWidgetFieldDto {
  key: string;
  label: string;
  fieldType: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  order?: number;
}

@Injectable({
  providedIn: 'root'
})
export class WidgetTypeService {
  private apiUrl = `${environment.API_URL}/widget-types`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<WidgetType[]> {
    return this.http.get<WidgetType[]>(`${this.apiUrl}`);
  }

  getActive(): Observable<WidgetType[]> {
    return this.http.get<WidgetType[]>(`${this.apiUrl}/active`);
  }

  getById(id: number): Observable<WidgetType> {
    return this.http.get<WidgetType>(`${this.apiUrl}/${id}`);
  }

  create(widgetType: CreateWidgetTypeDto): Observable<WidgetType> {
    return this.http.post<WidgetType>(`${this.apiUrl}`, widgetType);
  }

  update(id: number, widgetType: Partial<CreateWidgetTypeDto>): Observable<WidgetType> {
    return this.http.patch<WidgetType>(`${this.apiUrl}/${id}`, widgetType);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  addField(widgetTypeId: number, field: CreateWidgetFieldDto): Observable<WidgetField> {
    return this.http.post<WidgetField>(`${this.apiUrl}/${widgetTypeId}/fields`, field);
  }

  updateField(fieldId: number, field: Partial<CreateWidgetFieldDto>): Observable<WidgetField> {
    return this.http.patch<WidgetField>(`${this.apiUrl}/fields/${fieldId}`, field);
  }

  deleteField(fieldId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/fields/${fieldId}`);
  }

  initializeDefaults(): Observable<{ message: string }> {
    return this.http.get<{ message: string }>(`${this.apiUrl}/initialize`);
  }
}
