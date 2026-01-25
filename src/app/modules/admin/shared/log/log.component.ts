import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';

import { LogService, LogStats, LogsResponse } from './services/log.service';
import { LogsList } from './interface/log.interface';
import { GenericSnackbarService } from '@shared/services/generic-snackbar.service';
import { PaginationConfig } from '@admin/shared/components/pagination/pagination.component';
import { LogService as FrontendLogService } from '@shared/services/core-apis/log.service';
import { PublicationViewModalComponent, PublicationViewModalData } from './components/publication-view-modal/publication-view-modal.component';

@Component({
    selector: 'worky-log',
    templateUrl: './log.component.html',
    styleUrls: ['./log.component.scss'],
    standalone: false
})
export class LogComponent implements OnInit, OnDestroy {

  logs: LogsList[] = [];

  currentPage: number = 1;

  limit: number = 10;

  totalLogs: number = 0;

  filteredTotal: number = 0;

  totalPages: number = 0;

  hasNextPage: boolean = false;

  hasPrevPage: boolean = false;

  logStats: LogStats = {
    total: 0,
    error: 0,
    warn: 0,
    info: 0,
    debug: 0
  };

  expandedMetadata: { [key: string]: boolean } = {};

  isLoading: boolean = false;

  searchTerm: string = '';

  selectedLevel: string = '';

  autoRefresh: boolean = false;



  get paginationConfig(): PaginationConfig {
    return {
      currentPage: this.currentPage,
      totalPages: this.totalPages,
      totalItems: this.filteredTotal || this.totalLogs,
      itemsPerPage: this.limit,
      showInfo: true,
      showPageNumbers: true,
      maxPageNumbers: 5
    };
  }

  private autoRefreshTimer?: any;

  logLevels = [
    { value: '', label: 'admin.log.levels.all', icon: 'list' },
    { value: 'error', label: 'admin.log.levels.error', icon: 'error' },
    { value: 'warn', label: 'admin.log.levels.warn', icon: 'warning' },
    { value: 'info', label: 'admin.log.levels.info', icon: 'info' },
    { value: 'debug', label: 'admin.log.levels.debug', icon: 'bug_report' }
  ];

  Math = Math;

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
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
    }
  }

  loadLogs() {
    this.isLoading = true;
    this._cdr.markForCheck();
    
    this._logService.getLogs(
      this.currentPage, 
      this.limit, 
      this.selectedLevel, 
      this.searchTerm
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: LogsResponse) => {
        
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
      error: (error) => {
        console.error('Error loading logs:', error);
        this.isLoading = false;
        this._cdr.markForCheck();
      }
    });
  }

  loadLogStats() {
    this._logService.getLogStats().pipe(takeUntil(this.destroy$)).subscribe({
      next: (stats) => {
        this.logStats = stats;
        this._cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error loading log stats:', error);
      }
    });
  }

  refreshLogs() {
    this.loadLogs();
    this.loadLogStats();
  }

  /**
   * Clear pending logs from frontend queue
   * This prevents logs that were deleted from backend from being sent again
   */
  clearPendingLogs(): void {
    const pendingCount = this._frontendLogService.getPendingLogsCount();
    this._frontendLogService.clearPendingLogs();
    
    if (pendingCount > 0) {
      this._genericSnackbarService.info(`Cleared ${pendingCount} pending logs from queue`);
    } else {
      this._genericSnackbarService.info('No pending logs in queue');
    }
    
    // Refresh logs to show updated state
    this.refreshLogs();
  }

  filterByLevel(level: string) {
    // If clicking the same level, clear the filter
    if (this.selectedLevel === level) {
      this.clearFilters();
      return;
    }
    
    this.selectedLevel = level;
    this.currentPage = 1; // Reset to first page when filtering
    this.loadLogs();
  }

  onSearchChange() {
    this.currentPage = 1; // Reset to first page when searching
    this.loadLogs();
  }

  clearFilters() {
    this.selectedLevel = '';
    this.searchTerm = '';
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

  exportLogs() {
    const dataToExport = this.logs.map(log => ({
      timestamp: log.timestamp,
      level: log.level,
      message: log.message,
      context: log.context,
      metadata: log.metadata
    }));

    const csvContent = this.convertToCSV(dataToExport);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private convertToCSV(data: any[]): string {
    const headers = ['Timestamp', 'Level', 'Message', 'Context', 'Metadata'];
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      const values = [
        row.timestamp,
        row.level,
        `"${row.message.replace(/"/g, '""')}"`,
        `"${row.context.replace(/"/g, '""')}"`,
        `"${JSON.stringify(row.metadata).replace(/"/g, '""')}"`
      ];
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }

  getLogCountByLevel(level: string): number {
    // Use backend stats for accurate counts
    return this.logStats[level as keyof LogStats] || 0;
  }

  getLevelIcon(level: string): string {
    const iconMap: { [key: string]: string } = {
      'error': 'error',
      'warn': 'warning',
      'info': 'info',
      'debug': 'bug_report'
    };
    return iconMap[level] || 'help';
  }

  changePage(newPage: number | string): void {
    const pageNumber = typeof newPage === 'string' ? parseInt(newPage, 10) : newPage;
    
    if (pageNumber >= 1 && pageNumber <= this.totalPages) {
      this.currentPage = pageNumber;
      this.loadLogs();
    }
  }

  getPageNumbers(): number[] {
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;
    const maxPageNumbers = 5;

    if (totalPages <= maxPageNumbers) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    let startPage: number;
    let endPage: number;

    if (currentPage <= Math.ceil(maxPageNumbers / 2)) {
      startPage = 1;
      endPage = maxPageNumbers;
    } else if (currentPage + Math.floor(maxPageNumbers / 2) >= totalPages) {
      startPage = totalPages - maxPageNumbers + 1;
      endPage = totalPages;
    } else {
      startPage = currentPage - Math.floor(maxPageNumbers / 2);
      endPage = currentPage + Math.floor(maxPageNumbers / 2);
    }

    return Array.from({ length: (endPage - startPage + 1) }, (_, i) => startPage + i);
  }

  isPageActive(page: number): boolean {
    return this.currentPage === page;
  }

  toggleMetadata(logId: string): void {
    this.expandedMetadata[logId] = !this.expandedMetadata[logId];
  }

  isExpanded(logId: string): boolean {
    return this.expandedMetadata[logId] || false;
  }

  onCopy(data: any) {
    this._clipboard.copy(JSON.stringify(data, null, 2));
    this._genericSnackbarService.info('Metadata copied to clipboard!');
  }

  getVisiblePageNumbers(): number[] {
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;
    const maxPageNumbers = 5;

    if (totalPages <= maxPageNumbers) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    let startPage: number;
    let endPage: number;

    if (currentPage <= Math.ceil(maxPageNumbers / 2)) {
      startPage = 1;
      endPage = maxPageNumbers;
    } else if (currentPage + Math.floor(maxPageNumbers / 2) >= totalPages) {
      startPage = totalPages - maxPageNumbers + 1;
      endPage = totalPages;
    } else {
      startPage = currentPage - Math.floor(maxPageNumbers / 2);
      endPage = currentPage + Math.floor(maxPageNumbers / 2);
    }

    return Array.from({ length: (endPage - startPage + 1) }, (_, i) => startPage + i);
  }

  trackByLogId(index: number, log: LogsList): string {
    return log._id;
  }

  /**
   * Check if log has publicationId in metadata
   */
  hasPublicationId(log: LogsList): boolean {
    if (!log.metadata || typeof log.metadata !== 'object') return false;
    return !!(log.metadata as any)?.publicationId;
  }

  /**
   * Get publicationId from log metadata
   */
  getPublicationId(log: LogsList): string | null {
    if (!log.metadata || typeof log.metadata !== 'object') return null;
    return (log.metadata as any)?.publicationId || null;
  }

  /**
   * Get imageUrl from log metadata
   */
  getImageUrl(log: LogsList): string | null {
    if (!log.metadata || typeof log.metadata !== 'object') return null;
    return (log.metadata as any)?.imageUrl || 
           (log.metadata as any)?.failedImageUrl || 
           (log.metadata as any)?.normalizedUrl || null;
  }

  /**
   * Get mediaId from log metadata
   */
  getMediaId(log: LogsList): string | null {
    if (!log.metadata || typeof log.metadata !== 'object') return null;
    return (log.metadata as any)?.mediaId || null;
  }

  /**
   * Open publication view modal
   */
  openPublicationModal(log: LogsList, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const publicationId = this.getPublicationId(log);
    if (!publicationId) {
      this._genericSnackbarService.info('No publication ID found in log metadata');
      return;
    }

    const modalData: PublicationViewModalData = {
      publicationId: publicationId,
      imageUrl: this.getImageUrl(log) || undefined,
      mediaId: this.getMediaId(log) || undefined,
      logId: log._id // Pass log ID to mark as resolved after fixing
    };

    const dialogRef = this._dialog.open(PublicationViewModalComponent, {
      width: '90%',
      maxWidth: '900px',
      maxHeight: '90vh',
      data: modalData,
      panelClass: 'publication-modal-panel'
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result) => {
      // Refresh logs after modal closes to see if issue was resolved
      if (result?.refreshed) {
        this.refreshLogs();
      }
    });
  }
}
