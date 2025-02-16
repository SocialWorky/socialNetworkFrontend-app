import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import { environment } from '../../../../../environments/environment';
import { CustomField } from '../../modules/form-builder/interfaces/custom-field.interface';

@Injectable({
  providedIn: 'root',
})
export class CustomFieldService {
  private _apiUrl: string;

  constructor(
    private http: HttpClient,
    private _router: Router
  ) {
    this._apiUrl = environment.API_URL;
  }

  createCustomField(createCustomFieldDto: CustomField) {
    const url = `${this._apiUrl}/custom-fields`;
    return this.http.post(url, createCustomFieldDto);
  }

  updateCustomField(id: string, updateCustomFieldDto: CustomField) {
    const url = `${this._apiUrl}/custom-fields/${id}`;
    return this.http.patch(url, updateCustomFieldDto);
  }

  deleteCustomField(id: string) {
    const url = `${this._apiUrl}/custom-fields/${id}`;
    return this.http.delete(url);
  }

  getCustomFields() {
    const url = `${this._apiUrl}/custom-fields`;
    return this.http.get(url);
  }
}