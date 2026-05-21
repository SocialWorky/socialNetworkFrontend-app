import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from 'src/environments/environment';
import { ReportCreate } from '../../interfaces/report.interface';
import { ReportStatus } from '../../enums/report.enum';
import { Observable } from 'rxjs';
import { LogService, LevelLogEnum } from './log.service';

export interface ReportReporter {
  _id: string;
  name: string;
  lastName: string;
  username: string;
  avatar: string;
  email: string;
}

export interface ReportItem {
  _id: string;
  type: string;
  _idReported: string;
  reporting_user: string;
  reporter: ReportReporter | null;
  status: ReportStatus;
  detail_report: string;
  detail_resolution: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResolveReportDto {
  status: ReportStatus;
  detail_resolution: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReportsService {

  private baseUrl: string;

  constructor(
    private http: HttpClient,
    private logService: LogService
  ) {
    this.baseUrl = environment.API_URL;
  }

  createReport(report: ReportCreate) {
    this.logService.log(LevelLogEnum.WARN, 'ReportsService', 'Report created', {
      type: report.type,
      reportedId: report._idReported,
    });
    return this.http.post(`${this.baseUrl}/reports`, report);
  }

  getAllReports(): Observable<ReportItem[]> {
    return this.http.get<ReportItem[]>(`${this.baseUrl}/reports`, {
      headers: { 'Cache-Control': 'no-cache' },
    });
  }

  getReportById(id: string): Observable<ReportItem> {
    return this.http.get<ReportItem>(`${this.baseUrl}/reports/${id}`);
  }

  getReportsStatus(status: ReportStatus): Observable<ReportItem[]> {
    return this.http.get<ReportItem[]>(`${this.baseUrl}/reports/status/${status}`);
  }

  resolveReport(id: string, dto: ResolveReportDto): Observable<ReportItem> {
    return this.http.patch<ReportItem>(`${this.baseUrl}/reports/${id}`, dto);
  }

  deleteReport(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/reports/${id}`);
  }
}
