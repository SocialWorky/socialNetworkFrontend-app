import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { WidgetPosition, WidgetConfig, WidgetStatus } from '@shared/modules/worky-widget/worky-news/interface/widget.interface';
import { WidgetConfigService } from '@shared/modules/worky-widget/service/widget-config.service';

@Component({
  selector: 'worky-widget-container',
  template: `
    <div class="widget-container" [class]="position">
      <ng-container *ngFor="let widget of enabledWidgets; trackBy: trackByWidget">
        <div class="widget-wrapper" [attr.data-widget-selector]="widget.selector">
          <ng-container [ngSwitch]="widget.selector">
            <worky-weather *ngSwitchCase="'worky-weather'"></worky-weather>
            <worky-news *ngSwitchCase="'worky-news'"></worky-news>
            <!-- Agregar más widgets aquí según se vayan creando -->
          </ng-container>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .widget-container {
      width: 100%;
    }
    .widget-wrapper {
      margin-bottom: 10px;
    }
    .no-widgets {
      padding: 10px;
      background-color: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 4px;
      text-align: center;
      color: #666;
      font-size: 14px;
    }
  `],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WidgetContainerComponent implements OnInit, OnDestroy {
  @Input() position!: WidgetPosition;
  
  enabledWidgets: WidgetConfig[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private widgetConfigService: WidgetConfigService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Check if widgets are already loaded, if not initialize them
    if (!this.widgetConfigService.isInitialized()) {
      this.widgetConfigService.initializeData();
    }

    // Subscribe to both widgets and layout using combineLatest
    combineLatest([
      this.widgetConfigService.widgets$,
      this.widgetConfigService.widgetLayout$
    ])
    .pipe(takeUntil(this.destroy$))
    .subscribe(([widgets, layout]) => {
      this.updateEnabledWidgets();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateEnabledWidgets(): void {
    this.enabledWidgets = this.getEnabledWidgetsForPosition();
    this.cdr.markForCheck();
  }

  private getEnabledWidgetsForPosition(): WidgetConfig[] {
    const widgets = this.widgetConfigService.getWidgetsByPositionFromCache(this.position);
    if (!widgets || widgets.length === 0) {
      return [];
    }
    return widgets
      .filter((widget: WidgetConfig) => widget.status === WidgetStatus.ENABLED)
      .sort((a: WidgetConfig, b: WidgetConfig) => a.order - b.order);
  }

  trackByWidget(index: number, widget: WidgetConfig): string {
    return widget.selector;
  }
}
