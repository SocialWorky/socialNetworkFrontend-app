import { ReportType, ReportStatus } from '../enums/report.enum';

export interface ReportCreate {
  type: ReportType;
  status: ReportStatus;
  _idReported: string;
  reporting_user: string;
  detail_report?: string;
  detail_resolution?: string;
}