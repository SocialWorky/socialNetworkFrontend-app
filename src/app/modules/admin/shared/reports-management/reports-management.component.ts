import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { ReportItem, ResolveReportDto, ReportsService } from '@shared/services/core-apis/reports.service';
import { ReportStatus } from '@shared/enums/report.enum';
import { AlertService } from '@shared/services/alert.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { translations } from '@translations/translations';

type FilterType = 'all' | ReportStatus;

interface FilterOption {
  value: FilterType;
  label: string;
  activeClass: string;
}

@Component({
  selector: 'worky-reports-management',
  templateUrl: './reports-management.component.html',
  styleUrls: ['./reports-management.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ReportsManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  translations = translations;
  ReportStatus = ReportStatus;

  filters: FilterOption[] = [
    { value: 'all', label: translations['admin.reports.filterAll'], activeClass: 'bg-slate-500 border border-slate-400 text-white' },
    { value: ReportStatus.PENDING, label: translations['admin.reports.filterPending'], activeClass: 'bg-yellow-500/20 border border-yellow-500 text-yellow-400' },
    { value: ReportStatus.RESOLVED, label: translations['admin.reports.filterResolved'], activeClass: 'bg-emerald-500/20 border border-emerald-500 text-emerald-400' },
    { value: ReportStatus.REJECTED, label: translations['admin.reports.filterRejected'], activeClass: 'bg-red-500/20 border border-red-500 text-red-400' },
  ];

  allReports: ReportItem[] = [];
  filteredReports: ReportItem[] = [];
  activeFilter: FilterType = 'all';
  isLoading = false;
  errorMessage = '';

  selectedReport: ReportItem | null = null;
  showDetailPanel = false;
  actionError = '';
  resolutionForm!: FormGroup;
  isSubmitting = false;

  constructor(
    private readonly _reportsService: ReportsService,
    private readonly _alertService: AlertService,
    private readonly _cdr: ChangeDetectorRef,
    private readonly _fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.resolutionForm = this._fb.group({
      detail_resolution: ['', [Validators.required, Validators.minLength(10)]],
    });
    this.loadReports();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadReports(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this._reportsService.getAllReports()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (reports) => {
          this.allReports = reports;
          this.applyFilter(this.activeFilter);
          this.isLoading = false;
          this._cdr.markForCheck();
        },
        error: () => {
          this.errorMessage = translations['admin.reports.error.load'];
          this.isLoading = false;
          this._cdr.markForCheck();
        },
      });
  }

  applyFilter(filter: FilterType): void {
    this.activeFilter = filter;
    this.filteredReports = filter === 'all'
      ? [...this.allReports]
      : this.allReports.filter(r => r.status === filter);
    this._cdr.markForCheck();
  }

  openDetail(report: ReportItem): void {
    this.selectedReport = report;
    this.showDetailPanel = true;
    this.actionError = '';
    this.resolutionForm.reset();
    if (report.detail_resolution) {
      this.resolutionForm.patchValue({ detail_resolution: report.detail_resolution });
    }
    this._cdr.markForCheck();
  }

  closeDetail(): void {
    this.showDetailPanel = false;
    this.selectedReport = null;
    this._cdr.markForCheck();
  }

  resolve(): void {
    this.submitReport(ReportStatus.RESOLVED);
  }

  reject(): void {
    this.submitReport(ReportStatus.REJECTED);
  }

  private submitReport(status: ReportStatus): void {
    if (this.resolutionForm.invalid || !this.selectedReport) return;
    this.isSubmitting = true;
    this.actionError = '';

    const dto: ResolveReportDto = {
      status,
      detail_resolution: this.resolutionForm.value.detail_resolution as string,
    };

    this._reportsService.resolveReport(this.selectedReport._id, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.closeDetail();
          this.activeFilter = 'all';
          this.loadReports();
        },
        error: () => {
          this.actionError = translations['admin.reports.error.process'];
          this.isSubmitting = false;
          this._cdr.markForCheck();
        },
      });
  }

  deleteReport(report: ReportItem): void {
    this._alertService.showConfirmation(
      translations['admin.reports.delete.confirm'],
      '',
      translations['admin.reports.action.delete'],
      translations['button.cancel'],
      Alerts.WARNING,
      Position.CENTER,
    ).pipe(takeUntil(this.destroy$)).subscribe((confirmed) => {
      if (!confirmed) return;
      this.actionError = '';

      this._reportsService.deleteReport(report._id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.closeDetail();
            this.activeFilter = 'all';
            this.loadReports();
          },
          error: () => {
            this.actionError = translations['admin.reports.error.delete'];
            this._cdr.markForCheck();
          },
        });
    });
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      [ReportStatus.PENDING]: translations['admin.reports.status.pending'],
      [ReportStatus.RESOLVED]: translations['admin.reports.status.resolved'],
      [ReportStatus.REJECTED]: translations['admin.reports.status.rejected'],
    };
    return map[status] ?? status;
  }

  getTypeLabel(type: string): string {
    const map: Record<string, string> = {
      post: translations['admin.reports.type.post'],
      user: translations['admin.reports.type.user'],
      comment: translations['admin.reports.type.comment'],
      image: translations['admin.reports.type.image'],
    };
    return map[type] ?? type;
  }

  countByStatus(status: ReportStatus): number {
    return this.allReports.filter(r => r.status === status).length;
  }

  reporterName(report: ReportItem): string {
    if (!report.reporter) return report.reporting_user.slice(0, 8) + '...';
    return `${report.reporter.name} ${report.reporter.lastName}`;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-CL', {
      day: '2-digit', month: '2-digit', year: '2-digit',
    });
  }

  formatDateFull(dateStr: string): string {
    return new Date(dateStr).toLocaleString('es-CL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  shortId(id: string): string {
    return id ? id.slice(0, 8) + '...' : '—';
  }
}
