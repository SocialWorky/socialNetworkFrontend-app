import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslationsModule } from '@shared/modules/translations/translations.module';
import { Subject, takeUntil } from 'rxjs';
import { WidgetConfig, WidgetPosition, WidgetStatus } from '@shared/modules/worky-widget/worky-news/interface/widget.interface';
import { WidgetConfigService } from '@shared/modules/worky-widget/service/widget-config.service';
import { AlertService } from '@shared/services/alert.service';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { WidgetLayout } from '@shared/modules/worky-widget/worky-news/interface/widget.interface';
import { translations } from '@translations/translations';

@Component({
  selector: 'worky-widget-management',
  templateUrl: './widget-management.component.html',
  styleUrls: ['./widget-management.component.scss'],
  imports: [CommonModule, ReactiveFormsModule, TranslationsModule],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WidgetManagementComponent implements OnInit, OnDestroy {
  widgetForm: FormGroup;

  availableWidgets: WidgetConfig[] = [];

  configuredWidgets: WidgetConfig[] = [];

  currentLayout: any = { top: [], left: [], right: [] };

  availablePositions = Object.values(WidgetPosition);

  availableStatuses = Object.values(WidgetStatus);

  allowedPositionsForSelectedWidget: WidgetPosition[] = [];
  
  isSaving = false;
  isDeleting = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private widgetConfigService: WidgetConfigService,
    private alertService: AlertService,
    private _cdr: ChangeDetectorRef,
    private _logService: LogService
  ) {
    this.widgetForm = this.fb.group({
      selector: ['', Validators.required],
      name: ['', Validators.required],
      description: [''],
      position: [WidgetPosition.RIGHT, Validators.required],
      order: [0, Validators.required],
      status: [WidgetStatus.ENABLED, Validators.required],
      allowedPositions: [[]],
      icon: ['']
    });
  }

  ngOnInit(): void {
    this.loadAvailableWidgets();
    
    this.widgetConfigService.initializeData();
    
    this.loadConfiguredWidgets();
    this.loadLayout();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAvailableWidgets(): void {
    this.availableWidgets = this.widgetConfigService.getDefaultWidgets();
  }

  loadConfiguredWidgets(): void {
    this.widgetConfigService.widgets$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (widgets) => {
          this.configuredWidgets = widgets;
          this.syncData();
          this._cdr.markForCheck();
        },
        error: (error) => {
          this._logService.log(
            LevelLogEnum.ERROR,
            'WidgetManagementComponent',
            'Error loading configured widgets',
            { error: String(error) }
          );
        }
      });
  }

  loadLayout(): void {
    this.widgetConfigService.widgetLayout$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (layout) => {
          if (layout) {
            this.currentLayout = layout;
            this._cdr.markForCheck();
          }
        },
        error: (error) => {
          this._logService.log(
            LevelLogEnum.ERROR,
            'WidgetManagementComponent',
            'Error loading widget layout',
            { error: String(error) }
          );
        }
      });
  }

  onWidgetSelect(event: any): void {
    const selectedWidget = this.availableWidgets.find(w => w.selector === event.target.value);
    if (selectedWidget) {
      this.allowedPositionsForSelectedWidget = selectedWidget.allowedPositions;
      
      const existingConfig = this.widgetConfigService.getWidgetBySelectorFromCache(selectedWidget.selector);
      
      if (existingConfig) {
        this.widgetForm.patchValue({
          ...existingConfig,
          selector: selectedWidget.selector,
          allowedPositions: selectedWidget.allowedPositions
        });
      } else {
        this.widgetForm.patchValue({
          selector: selectedWidget.selector,
          name: selectedWidget.name,
          description: selectedWidget.description,
          position: selectedWidget.position,
          order: 0,
          status: WidgetStatus.DISABLED,
          allowedPositions: selectedWidget.allowedPositions,
          icon: selectedWidget.icon
        });
      }
      
      this._cdr.markForCheck();
    } else {
      this.allowedPositionsForSelectedWidget = [];
      this._cdr.markForCheck();
    }
  }

  saveWidget(): void {
    if (this.widgetForm.valid && !this.isSaving) {
      this.isSaving = true;
      this._cdr.markForCheck();
      
      const widgetConfig: WidgetConfig = this.widgetForm.value;
      
      if (!this.validateWidgetConstraints(widgetConfig)) {
        this.isSaving = false;
        this._cdr.markForCheck();
        return;
      }

      this.widgetConfigService.saveOrUpdateWidget(widgetConfig)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.alertService.showAlert(translations['admin.widgetManagement.success.title'], translations['admin.widgetManagement.success.saved'], Alerts.SUCCESS, Position.CENTER, true, translations['button.ok']);
            this.widgetForm.reset();
            this.widgetConfigService.forceRefresh();
            this.isSaving = false;
            this._cdr.markForCheck();
          },
          error: (error) => {
            this._logService.log(
              LevelLogEnum.ERROR,
              'WidgetManagementComponent',
              'Error saving widget',
              { error: String(error), widgetConfig }
            );
            this.alertService.showAlert(translations['admin.widgetManagement.errors.title'], translations['admin.widgetManagement.errors.saveError'], Alerts.ERROR, Position.CENTER, true, translations['button.ok']);
            this.isSaving = false;
            this._cdr.markForCheck();
          }
        });
    }
  }

  editWidget(widget: WidgetConfig): void {
    const originalWidget = this.availableWidgets.find(w => w.selector === widget.selector);
    
    if (originalWidget) {
      this.allowedPositionsForSelectedWidget = originalWidget.allowedPositions;
    }
    
    this.widgetForm.patchValue({
      ...widget,
      allowedPositions: originalWidget?.allowedPositions || widget.allowedPositions
    });
    
    this._cdr.markForCheck();
  }

  deleteWidget(selector: string): void {
    if (this.isDeleting) return;
    
    this.isDeleting = true;
    this._cdr.markForCheck();
    
    this.widgetConfigService.deleteWidget(selector)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.alertService.showAlert(translations['admin.widgetManagement.success.title'], translations['admin.widgetManagement.success.deleted'], Alerts.SUCCESS, Position.CENTER, true, translations['button.ok']);
          this.widgetConfigService.forceRefresh();
          this.isDeleting = false;
          this._cdr.markForCheck();
        },
        error: (error) => {
          this._logService.log(
            LevelLogEnum.ERROR,
            'WidgetManagementComponent',
            'Error deleting widget',
            { error: String(error), widgetSelector: selector }
          );
                      this.alertService.showAlert(translations['admin.widgetManagement.errors.title'], translations['admin.widgetManagement.errors.deleteError'], Alerts.ERROR, Position.CENTER, true, translations['button.ok']);
          this.isDeleting = false;
          this._cdr.markForCheck();
        }
      });
  }

  private validateWidgetConstraints(widget: WidgetConfig): boolean {
    if (!widget.allowedPositions.includes(widget.position)) {
      this.alertService.showAlert(
        translations['admin.widgetManagement.errors.title'],
        translations['admin.widgetManagement.errors.invalidPosition'].replace('{position}', widget.position),
        Alerts.ERROR,
        Position.CENTER,
        true
      );
      return false;
    }

    if (widget.status === WidgetStatus.ENABLED) {
      const canAdd = this.widgetConfigService.canAddWidgetToPosition(widget.position, widget.selector);
      if (!canAdd) {
        const limit = this.widgetConfigService.getPositionLimit(widget.position);
        const current = this.widgetConfigService.getWidgetsCountInPosition(widget.position);
        
        this.alertService.showAlert(
          translations['admin.widgetManagement.errors.title'],
          translations['admin.widgetManagement.errors.maxWidgetsReached']
            .replace('{limit}', limit.toString())
            .replace('{position}', widget.position)
            .replace('{current}', current.toString()),
          Alerts.ERROR,
          Position.CENTER,
          true,
          translations['button.ok']
        );
        return false;
      }
    }

    return true;
  }

  getWidgetsByPosition(position: WidgetPosition): WidgetConfig[] {
    const widgets = this.widgetConfigService.getWidgetsByPositionFromCache(position);
    return widgets;
  }

  getPositionInfo(position: WidgetPosition): string {
    const current = this.widgetConfigService.getWidgetsCountInPosition(position);
    const limit = this.widgetConfigService.getPositionLimit(position);
    return translations['admin.widgetManagement.positionInfo'].replace('{current}', current.toString()).replace('{limit}', limit.toString());
  }

  trackByWidget(index: number, widget: WidgetConfig): string {
    return widget.selector;
  }

  private syncData(): void {
    if (this.configuredWidgets.length > 0 && (!this.currentLayout || 
        Object.values(this.currentLayout).every((arr: unknown) => (arr as any[]).length === 0))) {
      
      const newLayout: WidgetLayout = { top: [], left: [], right: [] };
      
      this.configuredWidgets.forEach(widget => {
        if (widget.position && newLayout[widget.position]) {
          newLayout[widget.position].push(widget);
        }
      });
      
      Object.keys(newLayout).forEach(position => {
        newLayout[position as keyof WidgetLayout].sort((a, b) => a.order - b.order);
      });
      
      this.currentLayout = newLayout;
      this._cdr.markForCheck();
    }
  }
}
