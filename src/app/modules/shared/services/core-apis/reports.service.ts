import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { environment } from 'src/environments/environment';
import { ReportCreate } from '../../interfaces/report.interface';
import { ReportStatus } from '../../enums/report.enum';
import { Observable } from 'rxjs';
import { LogService, LevelLogEnum } from './log.service';

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
    const url = `${this.baseUrl}/reports`;
    
    this.logService.log(
      LevelLogEnum.WARN,
      'ReportsService',
      'Report created',
      { 
        type: report.type, 
        reportedId: report._idReported, 
        reportingUser: report.reporting_user,
        status: report.status 
      }
    );
    
    return this.http.post(url, report);
  }

  editReport(report: ReportCreate, id: string) {
    const url = `${this.baseUrl}/reports/${id}`;
    
    this.logService.log(
      LevelLogEnum.INFO,
      'ReportsService',
      'Report updated',
      { 
        reportId: id,
        type: report.type, 
        reportedId: report._idReported, 
        status: report.status 
      }
    );
    
    return this.http.put(url, report);
  }

  getReportsStatus(status: ReportStatus): Observable<any> {
    const url = `${this.baseUrl}/reports/status/${status}`;
    return this.http.get(url);
  }
}
