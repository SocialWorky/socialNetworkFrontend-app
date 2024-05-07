import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { RegisterData } from '../interfaces/register.interface';

@Injectable({
  providedIn: 'root'
})
export class AuthApiRegisterService {
  private _baseUrl: string;

  constructor(private http: HttpClient) {
    this._baseUrl = environment.API_URL;
  }

  registerUser(body: RegisterData) {
    const url = `${this._baseUrl}/user/create`;
    return this.http.post(url, body);
  }
}
