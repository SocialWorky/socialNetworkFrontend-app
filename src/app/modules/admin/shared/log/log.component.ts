import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { LogService } from './services/log.service';
import { LogsList, Logs } from './interface/log.interface';
import { GenericSnackbarService } from '@shared/services/generic-snackbar.service';
import { Subject, takeUntil } from 'rxjs';

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

  expandedMetadata: { [key: string]: boolean } = {};

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
  }

  loadLogs() {
    this._logService.getLogs(this.currentPage, this.limit).pipe(takeUntil(this.destroy$)).subscribe((res) => {
      this.logs = res.logs;
      this.totalLogs = res.total;
      this._cdr.markForCheck();
    });
  }

  changePage(newPage: number): void {
    if (newPage >= 1 && newPage <= Math.ceil(this.totalLogs / this.limit)) {
      this.currentPage = newPage;
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

  onCopy(data: Object) {
    const str = JSON.stringify(data, null, 2);
    this._clipboard.copy(str);
    this._genericSnackbarService.info('Copied to clipboard');
  }

}
