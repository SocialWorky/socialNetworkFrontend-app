import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { CustomField } from '../modules/form-builder/interfaces/custom-field.interface';

@Injectable({
  providedIn: 'root',
})
export class CustomFieldService {
  private _apiUrl: string;
  
  private _token = localStorage.getItem('token');

  constructor(
    private http: HttpClient,
    private _router: Router
  ) {
    this._token = localStorage.getItem('token');
    if (!this._token) this._router.navigate(['/']);
    this._apiUrl = environment.API_URL;
  }

  private getHeaders(): HttpHeaders {
    const token = this._token;
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return headers;
  }

  createCustomField(createCustomFieldDto: CustomField) {
    const url = `${this._apiUrl}/custom-fields`;
    const headers = this.getHeaders();
    return this.http.post(url, createCustomFieldDto, { headers });
  }

  updateCustomField(id: string, updateCustomFieldDto: CustomField) {
    const url = `${this._apiUrl}/custom-fields/${id}`;
    const headers = this.getHeaders();
    return this.http.patch(url, updateCustomFieldDto, { headers });
  }

  deleteCustomField(id: string) {
    const url = `${this._apiUrl}/custom-fields/${id}`;
    const headers = this.getHeaders();
    return this.http.delete(url, { headers });
  }

  getCustomFields() {
    const url = `${this._apiUrl}/custom-fields`;
    const headers = this.getHeaders();
    return this.http.get(url, { headers });
  }
}