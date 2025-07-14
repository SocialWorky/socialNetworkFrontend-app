import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { WidgetConfig, WidgetPosition, WidgetStatus } from '@shared/modules/worky-widget/worky-news/interface/widget.interface';
import { WidgetConfigService } from '@shared/modules/worky-widget/worky-news/service/widget-config.service';
import { AlertService } from '@shared/services/alert.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { WidgetLayout } from '@shared/modules/worky-widget/worky-news/interface/widget.interface';

@Component({
  selector: 'worky-widget-management',
  templateUrl: './widget-management.component.html',
  styleUrls: ['./widget-management.component.scss'],
  imports: [CommonModule, ReactiveFormsModule],
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
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private widgetConfigService: WidgetConfigService,
    private alertService: AlertService,
    private _cdr: ChangeDetectorRef
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
          console.error('Error cargando widgets configurados:', error);
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
          console.error('Error cargando layout:', error);
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
    if (this.widgetForm.valid) {
      const widgetConfig: WidgetConfig = this.widgetForm.value;
      
      if (!this.validateWidgetConstraints(widgetConfig)) {
        return;
      }

      const existingWidget = this.widgetConfigService.getWidgetBySelectorFromCache(widgetConfig.selector);
      
      if (existingWidget) {
        this.widgetConfigService.updateWidget(widgetConfig.selector, widgetConfig)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.alertService.showAlert('Éxito', 'Widget actualizado correctamente', Alerts.SUCCESS, Position.CENTER, true, 'Aceptar');
              this.widgetForm.reset();
              this.widgetConfigService.forceRefresh();
              this._cdr.markForCheck();
            },
            error: () => {
              this.alertService.showAlert('Error', 'Error al actualizar widget', Alerts.ERROR, Position.CENTER, true, 'Aceptar');
            }
          });
      } else {
        this.widgetConfigService.createWidget(widgetConfig)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.alertService.showAlert('Éxito', 'Widget creado correctamente', Alerts.SUCCESS, Position.CENTER, true, 'Aceptar');
              this.widgetForm.reset();
              this.widgetConfigService.forceRefresh();
              this._cdr.markForCheck();
            },
            error: () => {
              this.alertService.showAlert('Error', 'Error al crear widget', Alerts.ERROR, Position.CENTER, true, 'Aceptar');
            }
          });
      }
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
    this.widgetConfigService.deleteWidget(selector)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.alertService.showAlert('Éxito', 'Widget eliminado correctamente', Alerts.SUCCESS, Position.CENTER, true, 'Aceptar');
          this.widgetConfigService.forceRefresh();
          this._cdr.markForCheck();
        },
        error: () => {
          this.alertService.showAlert('Error', 'Error al eliminar widget', Alerts.ERROR, Position.CENTER, true, 'Aceptar');
        }
      });
  }

  private validateWidgetConstraints(widget: WidgetConfig): boolean {
    if (!widget.allowedPositions.includes(widget.position)) {
      this.alertService.showAlert(
        'Error',
        `Este widget no puede ir en la posición ${widget.position}`,
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
          'Error',
          `Máximo ${limit} widgets permitidos en ${widget.position}. Actualmente hay ${current} widgets habilitados.`,
          Alerts.ERROR,
          Position.CENTER,
          true,
          'Aceptar'
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
    return `${current}/${limit} widgets`;
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
