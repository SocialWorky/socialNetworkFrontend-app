import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';

import { LogService } from './services/log.service';
import { LogsList, LogStats } from './interface/log.interface';
import { GenericSnackbarService } from '@shared/services/generic-snackbar.service';
import { PaginationConfig } from '@admin/shared/components/pagination/pagination.component';
import { LogService as FrontendLogService } from '@shared/services/core-apis/log.service';
import { PublicationViewModalComponent, PublicationViewModalData } from './components/publication-view-modal/publication-view-modal.component';

@Component({
  selector: 'worky-log',
  templateUrl: './log.component.html',
  styleUrls: ['./log.component.scss'],
  standalone: false,
})
export class LogComponent implements OnInit, OnDestroy {

  logs: LogsList[] = [];
  currentPage = 1;
  limit = 10;
  totalLogs = 0;
  filteredTotal = 0;
  totalPages = 0;
  hasNextPage = false;
  hasPrevPage = false;

  logStats: LogStats = {
    total: 0,
    error: 0,
    warn: 0,
    info: 0,
    debug: 0,
    bySource: { backend: 0, frontend: 0, mobile: 0 },
  };

  expandedMetadata: Record<string, boolean> = {};
  isLoading = false;

  searchTerm = '';
  selectedLevel = '';
  selectedSource = '';
  selectedEvent = '';

  autoRefresh = false;
  Math = Math;

  logLevels = [
    { value: '', label: 'admin.log.levels.all', icon: 'list' },
    { value: 'error', label: 'admin.log.levels.error', icon: 'error' },
    { value: 'warn', label: 'admin.log.levels.warn', icon: 'warning' },
    { value: 'info', label: 'admin.log.levels.info', icon: 'info' },
    { value: 'debug', label: 'admin.log.levels.debug', icon: 'bug_report' },
  ];

  logSources = [
    { value: '', label: 'Todos', icon: 'all_inclusive' },
    { value: 'backend', label: 'Backend', icon: 'dns' },
    { value: 'frontend', label: 'Frontend', icon: 'web' },
    { value: 'mobile', label: 'Mobile', icon: 'phone_android' },
  ];

  get paginationConfig(): PaginationConfig {
    return {
      currentPage: this.currentPage,
      totalPages: this.totalPages,
      totalItems: this.filteredTotal || this.totalLogs,
      itemsPerPage: this.limit,
      showInfo: true,
      showPageNumbers: true,
      maxPageNumbers: 5,
    };
  }

  get hasActiveFilters(): boolean {
    return !!(this.selectedLevel || this.searchTerm || this.selectedSource || this.selectedEvent);
  }

  private autoRefreshTimer?: any;
  private destroy$ = new Subject<void>();

  constructor(
    private _logService: LogService,
    private _frontendLogService: FrontendLogService,
    private _clipboard: Clipboard,
    private _genericSnackbarService: GenericSnackbarService,
    private _cdr: ChangeDetectorRef,
    private _dialog: MatDialog,
  ) {}

  ngOnInit() {
    this.loadLogs();
    this.loadLogStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.autoRefreshTimer) clearInterval(this.autoRefreshTimer);
  }

  loadLogs() {
    this.isLoading = true;
    this._cdr.markForCheck();

    this._logService.getLogs({
      page: this.currentPage,
      limit: this.limit,
      level: this.selectedLevel || undefined,
      search: this.searchTerm || undefined,
      source: this.selectedSource || undefined,
      event: this.selectedEvent || undefined,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.logs = response.logs;
        this.totalLogs = response.total;
        this.filteredTotal = response.filteredTotal;
        this.totalPages = response.totalPages;
        this.currentPage = response.currentPage;
        this.hasNextPage = response.hasNextPage;
        this.hasPrevPage = response.hasPrevPage;
        this.isLoading = false;
        this._cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this._cdr.markForCheck();
      },
    });
  }

  loadLogStats() {
    this._logService.getLogStats().pipe(takeUntil(this.destroy$)).subscribe({
      next: (stats) => {
        this.logStats = stats;
        this._cdr.markForCheck();
      },
      error: () => {},
    });
  }

  refreshLogs() {
    this.loadLogs();
    this.loadLogStats();
  }

  filterByLevel(level: string) {
    this.selectedLevel = this.selectedLevel === level ? '' : level;
    this.currentPage = 1;
    this.loadLogs();
  }

  filterBySource(source: string) {
    this.selectedSource = this.selectedSource === source ? '' : source;
    this.currentPage = 1;
    this.loadLogs();
  }

  onSearchChange() {
    this.currentPage = 1;
    this.loadLogs();
  }

  onEventFilter(event: string) {
    this.selectedEvent = event;
    this.currentPage = 1;
    this.loadLogs();
  }

  clearFilters() {
    this.selectedLevel = '';
    this.searchTerm = '';
    this.selectedSource = '';
    this.selectedEvent = '';
    this.currentPage = 1;
    this.loadLogs();
  }

  onLimitChange() {
    this.currentPage = 1;
    this.loadLogs();
  }

  toggleAutoRefresh() {
    if (this.autoRefresh) {
      this.autoRefreshTimer = setInterval(() => {
        this.loadLogs();
        this.loadLogStats();
      }, 30000);
    } else {
      if (this.autoRefreshTimer) {
        clearInterval(this.autoRefreshTimer);
        this.autoRefreshTimer = undefined;
      }
    }
  }

  clearPendingLogs(): void {
    const pendingCount = this._frontendLogService.getPendingLogsCount();
    this._frontendLogService.clearPendingLogs();
    this._genericSnackbarService.info(
      pendingCount > 0 ? `Cleared ${pendingCount} pending logs` : 'No pending logs in queue',
    );
    this.refreshLogs();
  }

  exportLogs() {
    const dataToExport = this.logs.map((log) => ({
      timestamp: log.timestamp,
      level: log.level,
      source: log.source ?? '',
      context: log.context,
      event: log.event ?? '',
      message: log.message,
      userId: log.userId ?? '',
      method: log.method ?? '',
      path: log.path ?? '',
      statusCode: log.statusCode ?? '',
      durationMs: log.durationMs ?? '',
      metadata: log.metadata ? JSON.stringify(log.metadata) : '',
    }));

    const headers = ['Timestamp', 'Level', 'Source', 'Context', 'Event', 'Message', 'UserId', 'Method', 'Path', 'StatusCode', 'DurationMs', 'Metadata'];
    const csvRows = [headers.join(',')];
    for (const row of dataToExport) {
      const values = Object.values(row).map((v) =>
        typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v,
      );
      csvRows.push(values.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getLogCountByLevel(level: string): number {
    return (this.logStats as any)[level] ?? 0;
  }

  getLevelIcon(level: string): string {
    return ({ error: 'error', warn: 'warning', info: 'info', debug: 'bug_report' } as any)[level] ?? 'help';
  }

  getSourceIcon(source: string): string {
    return ({ backend: 'dns', frontend: 'web', mobile: 'phone_android' } as any)[source] ?? 'help_outline';
  }

  getStatusCodeClass(code: number): string {
    if (!code) return 'text-slate-400';
    if (code < 300) return 'text-green-400';
    if (code < 400) return 'text-blue-400';
    if (code < 500) return 'text-yellow-400';
    return 'text-red-400';
  }

  changePage(newPage: number | string): void {
    const p = typeof newPage === 'string' ? parseInt(newPage, 10) : newPage;
    if (p >= 1 && p <= this.totalPages) {
      this.currentPage = p;
      this.loadLogs();
    }
  }

  toggleMetadata(logId: string): void {
    this.expandedMetadata[logId] = !this.expandedMetadata[logId];
  }

  isExpanded(logId: string): boolean {
    return !!this.expandedMetadata[logId];
  }

  onCopy(data: any) {
    this._clipboard.copy(JSON.stringify(data, null, 2));
    this._genericSnackbarService.info('Copied to clipboard!');
  }

  trackByLogId(_: number, log: LogsList): string {
    return log._id;
  }

  hasMetadataKeys(metadata: Record<string, any> | null): boolean {
    if (!metadata) return false;
    return Object.keys(metadata).length > 0;
  }

  hasPublicationId(log: LogsList): boolean {
    return !!(log.metadata as any)?.publicationId;
  }

  getPublicationId(log: LogsList): string | null {
    return (log.metadata as any)?.publicationId ?? null;
  }

  getImageUrl(log: LogsList): string | null {
    if (!log.metadata) return null;
    return (log.metadata as any)?.imageUrl ?? (log.metadata as any)?.failedImageUrl ?? null;
  }

  getMediaId(log: LogsList): string | null {
    return (log.metadata as any)?.mediaId ?? null;
  }

  openPublicationModal(log: LogsList, event?: Event): void {
    if (event) event.stopPropagation();
    const publicationId = this.getPublicationId(log);
    if (!publicationId) {
      this._genericSnackbarService.info('No publication ID in log metadata');
      return;
    }

    const modalData: PublicationViewModalData = {
      publicationId,
      imageUrl: this.getImageUrl(log) ?? undefined,
      mediaId: this.getMediaId(log) ?? undefined,
      logId: log._id,
    };

    this._dialog.open(PublicationViewModalComponent, {
      width: '90%',
      maxWidth: '900px',
      maxHeight: '90vh',
      data: modalData,
      panelClass: 'publication-modal-panel',
    }).afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result) => {
      if (result?.refreshed) this.refreshLogs();
    });
  }
}
