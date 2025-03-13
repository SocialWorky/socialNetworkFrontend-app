import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { InvitationsCodeList } from '../interface/invitations-code.interface';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InvitationsCodeService {

  urlApi = `${environment.API_URL}/invitations-code`;

  constructor(
    private _http: HttpClient, 
  ) { }
  postGenerateInvitationsCode(email: string): Observable<InvitationsCodeList> {
    return this._http.post<InvitationsCodeList>(`${this.urlApi}/generate`, { email });
  }

  getInvitationsCode(): Observable<InvitationsCodeList[]> {
    return this._http.get<InvitationsCodeList[]>(`${this.urlApi}`);
  }

}
