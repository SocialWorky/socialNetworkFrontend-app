import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { environment } from 'src/environments/environment';
import { ReportCreate } from '../../interfaces/report.interface';
import { ReportStatus } from '../../enums/report.enum';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReportsService {

  private baseUrl: string;

  constructor(private http: HttpClient) {
    this.baseUrl = environment.API_URL;
  }

  createReport(report: ReportCreate) {
    const url = `${this.baseUrl}/reports`;
    return this.http.post(url, report);
  }

  editReport(report: ReportCreate, id: string) {
    const url = `${this.baseUrl}/reports/${id}`;
    return this.http.put(url, report);
  }

  getReportsStatus(status: ReportStatus): Observable<any> {
    const url = `${this.baseUrl}/reports/status/${status}`;
    return this.http.get(url);
  }

}
