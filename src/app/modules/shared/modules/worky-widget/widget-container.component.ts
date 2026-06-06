import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { WidgetPosition, WidgetConfig, WidgetStatus } from '@shared/modules/worky-widget/worky-news/interface/widget.interface';
import { WidgetConfigService } from '@shared/modules/worky-widget/service/widget-config.service';

@Component({
  selector: 'worky-widget-container',
  templateUrl: './widget-container.component.html',
  styleUrls: ['./widget-container.component.scss'],
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

  shouldShowTitle(widget: WidgetConfig): boolean {
    // Check if showTitle is explicitly set in config, default to true
    if (widget.config && widget.config.hasOwnProperty('showTitle')) {
      return widget.config['showTitle'] !== false;
    }
    // Default to showing title if not specified
    return true;
  }
}
