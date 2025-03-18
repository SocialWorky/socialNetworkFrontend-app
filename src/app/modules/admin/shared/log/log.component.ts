import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { LogService } from './services/log.service';
import { LogsList } from './interface/log.interface';
import { GenericSnackbarService } from '@shared/services/generic-snackbar.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'worky-log',
  templateUrl: './log.component.html',
  styleUrls: ['./log.component.scss']
})
export class LogComponent implements OnInit {

  logs: LogsList[] = [];

  expandedMetadata: { [key: string]: boolean } = {};

  private destroy$ = new Subject<void>();

  constructor(
    private _logService: LogService,
    private _clipboard: Clipboard,
    private _genericSnackbarService: GenericSnackbarService,
    private _cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loadLog();
  }

  loadLog() {
    this._logService.getLogs().pipe(takeUntil(this.destroy$)).subscribe((res) => {
      this.logs = res;
      this._cdr.markForCheck();
    });
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
