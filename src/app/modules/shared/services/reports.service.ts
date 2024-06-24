import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { environment } from 'src/environments/environment';
import { ReportCreate } from '../interfaces/report.interface';
import { ReportStatus } from '../enums/report.enum';
import { Observable } from 'rxjs';



@Injectable({
  providedIn: 'root'
})
export class ReportsService {

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

  createReport(report: ReportCreate) {
    const url = `${this.baseUrl}/reports`;
    const headers = this.getHeaders();
    return this.http.post(url, report, { headers });
  }

  editReport(report: ReportCreate, id: string) {
    const url = `${this.baseUrl}/reports/${id}`;
    const headers = this.getHeaders();
    return this.http.put(url, report, { headers });
  }

  getReportsStatus(status: ReportStatus): Observable<any> {
    const url = `${this.baseUrl}/reports/status/${status}`;
    const headers = this.getHeaders();
    return this.http.get(url, { headers });
  }

}
