import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { Subject, takeUntil } from 'rxjs';

import { LogService } from './services/log.service';
import { LogsList } from './interface/log.interface';
import { GenericSnackbarService } from '@shared/services/generic-snackbar.service';

@Component({
    selector: 'worky-log',
    templateUrl: './log.component.html',
    styleUrls: ['./log.component.scss'],
    standalone: false
})
export class LogComponent implements OnInit, OnDestroy {

  logs: LogsList[] = [];

  filteredLogs: LogsList[] = [];

  currentPage: number = 1;

  limit: number = 10;

  totalLogs: number = 0;

  expandedMetadata: { [key: string]: boolean } = {};

  isLoading: boolean = false;

  searchTerm: string = '';

  selectedLevel: string = '';

  autoRefresh: boolean = false;

  private autoRefreshTimer?: any;

  logLevels = [
    { value: '', label: 'Todos', icon: 'list' },
    { value: 'error', label: 'Errores', icon: 'error' },
    { value: 'warn', label: 'Advertencias', icon: 'warning' },
    { value: 'info', label: 'Información', icon: 'info' },
    { value: 'debug', label: 'Debug', icon: 'bug_report' }
  ];

  Math = Math;

  private destroy$ = new Subject<void>();

  constructor(
    private _logService: LogService,
    private _clipboard: Clipboard,
    private _genericSnackbarService: GenericSnackbarService,
    private _cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loadLogs();
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
    this._logService.getLogs(this.currentPage, this.limit).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.logs = res.logs;
        this.totalLogs = res.total;
        this.applyFilters();
        this.isLoading = false;
        this._cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error loading logs:', error);
        this.isLoading = false;
        this._genericSnackbarService.error('Error al cargar los logs');
        this._cdr.markForCheck();
      }
    });
  }

  refreshLogs() {
    this.loadLogs();
  }

  applyFilters() {
    this.filteredLogs = this.logs.filter(log => {
      const matchesLevel = !this.selectedLevel || log.level === this.selectedLevel;
      const matchesSearch = !this.searchTerm || 
        log.message.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        log.context.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      return matchesLevel && matchesSearch;
    });
  }

  filterByLevel(level: string) {
    this.selectedLevel = level;
    this.applyFilters();
  }

  onSearchChange() {
    this.applyFilters();
  }

  onLimitChange() {
    this.currentPage = 1;
    this.loadLogs();
  }

  toggleAutoRefresh() {
    if (this.autoRefresh) {
      this.autoRefreshTimer = setInterval(() => {
        this.loadLogs();
      }, 30000);
    } else {
      if (this.autoRefreshTimer) {
        clearInterval(this.autoRefreshTimer);
        this.autoRefreshTimer = undefined;
      }
    }
  }

  exportLogs() {
    const dataToExport = this.filteredLogs.map(log => ({
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
    return this.logs.filter(log => log.level === level).length;
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
    if (pageNumber >= 1 && pageNumber <= Math.ceil(this.totalLogs / this.limit)) {
      this.currentPage = pageNumber;
      this.loadLogs();
    }
  }

  getPageNumbers(): number[] {
    const totalPages = Math.ceil(this.totalLogs / this.limit);
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  isPageActive(page: number): boolean {
    return this.currentPage === page;
  }

  toggleMetadata(logId: string): void {
    this.expandedMetadata[logId] = !this.expandedMetadata[logId];
  }

  isExpanded(logId: string): boolean {
    return !!this.expandedMetadata[logId];
  }

  onCopy(data: any) {
    const str = typeof data === 'object' ? JSON.stringify(data, null, 2) : data.toString();
    this._clipboard.copy(str);
    this._genericSnackbarService.info('Copiado al portapapeles');
  }

  getVisiblePageNumbers(): number[] {
    const totalPages = Math.ceil(this.totalLogs / this.limit);
    const current = this.currentPage;
    const pages: number[] = [];

    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (current <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push(totalPages);
    } else if (current >= totalPages - 3) {
      pages.push(1);
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      for (let i = current - 1; i <= current + 1; i++) pages.push(i);
      pages.push(totalPages);
    }

    return pages;
  }

}
