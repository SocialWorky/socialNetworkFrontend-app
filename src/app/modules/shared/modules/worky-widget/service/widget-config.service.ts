import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '@env/environment';
import { WidgetConfig, WidgetLayout, WidgetPosition, WidgetStatus } from '@shared/modules/worky-widget/worky-news/interface/widget.interface';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';

@Injectable({
  providedIn: 'root'
})
export class WidgetConfigService {
  private apiUrl = `${environment.API_URL}/widgets`;
  private widgetLayoutSubject = new BehaviorSubject<WidgetLayout | null>(null);
  private widgetsSubject = new BehaviorSubject<WidgetConfig[]>([]);
  private isLoading = false;
  
  public widgetLayout$ = this.widgetLayoutSubject.asObservable();
  public widgets$ = this.widgetsSubject.asObservable();
  
  private positionLimits = {
    [WidgetPosition.TOP]: 1,
    [WidgetPosition.LEFT]: 3,
    [WidgetPosition.RIGHT]: 3
  };

  private defaultWidgets: WidgetConfig[] = [
    {
      selector: 'worky-weather',
      name: 'Clima',
      description: 'Muestra información del clima actual',
      position: WidgetPosition.RIGHT,
      order: 0,
      status: WidgetStatus.ENABLED,
      allowedPositions: [WidgetPosition.LEFT, WidgetPosition.RIGHT],
      icon: 'wb_sunny'
    },
    {
      selector: 'worky-news',
      name: 'Noticias',
      description: 'Muestra las últimas noticias',
      position: WidgetPosition.RIGHT,
      order: 0,
      status: WidgetStatus.ENABLED,
      allowedPositions: [WidgetPosition.LEFT, WidgetPosition.RIGHT],
      icon: 'article'
    }
  ];

  constructor(
    private http: HttpClient,
    private logService: LogService
  ) {}

  getAllWidgets(): Observable<WidgetConfig[]> {
    return this.http.get<WidgetConfig[]>(`${this.apiUrl}`).pipe(
      tap(widgets => {
        if (!widgets || widgets.length === 0) {
          this.widgetsSubject.next(this.defaultWidgets);
        } else {
          this.widgetsSubject.next(widgets);
        }
        this.isLoading = false;
      }),
      catchError((error) => {
        // Only log error if it's not an authentication error
        if (error.status !== 401) {
          this.logService.log(LevelLogEnum.ERROR, 'WidgetConfigService', 'Error obteniendo widgets', { error: error.message, status: error.status });
        }
        this.widgetsSubject.next(this.defaultWidgets);
        this.isLoading = false;
        return of(this.defaultWidgets);
      })
    );
  }

  getWidgetLayout(): Observable<WidgetLayout> {
    return this.http.get<WidgetLayout>(`${this.apiUrl}/layout`).pipe(
      tap(layout => {
        this.widgetLayoutSubject.next(layout);
        this.isLoading = false;
      }),
      catchError((error) => {
        // Only log error if it's not an authentication error
        if (error.status !== 401) {
          this.logService.log(LevelLogEnum.ERROR, 'WidgetConfigService', 'Error obteniendo layout', { error: error.message, status: error.status });
        }
        const defaultLayout: WidgetLayout = {
          top: [],
          left: [
            {
              selector: 'worky-weather',
              name: 'Clima',
              description: 'Muestra información del clima actual',
              position: WidgetPosition.LEFT,
              order: 1,
              status: WidgetStatus.ENABLED,
              allowedPositions: [WidgetPosition.LEFT, WidgetPosition.RIGHT],
              icon: 'wb_sunny'
            }
          ],
          right: [
            {
              selector: 'worky-news',
              name: 'Noticias',
              description: 'Muestra las últimas noticias',
              position: WidgetPosition.RIGHT,
              order: 1,
              status: WidgetStatus.ENABLED,
              allowedPositions: [WidgetPosition.LEFT, WidgetPosition.RIGHT, WidgetPosition.TOP],
              icon: 'article'
            }
          ]
        };
        this.widgetLayoutSubject.next(defaultLayout);
        this.isLoading = false;
        return of(defaultLayout);
      })
    );
  }

  getWidgetsByPosition(position: WidgetPosition): Observable<WidgetConfig[]> {
    return this.http.get<WidgetConfig[]>(`${this.apiUrl}/position/${position}`);
  }

  createWidget(widget: WidgetConfig): Observable<WidgetConfig> {
    return this.http.post<WidgetConfig>(`${this.apiUrl}`, widget).pipe(
      tap(() => this.refreshData())
    );
  }

  updateWidget(selector: string, widget: Partial<WidgetConfig>): Observable<WidgetConfig> {
    return this.http.patch<WidgetConfig>(`${this.apiUrl}/${selector}`, widget).pipe(
      tap(() => this.refreshData())
    );
  }

  updateWidgetOrder(selector: string, order: number): Observable<WidgetConfig> {
    return this.http.patch<WidgetConfig>(`${this.apiUrl}/${selector}/order`, { order }).pipe(
      tap(() => this.refreshData())
    );
  }

  toggleWidgetStatus(selector: string): Observable<WidgetConfig> {
    return this.http.patch<WidgetConfig>(`${this.apiUrl}/${selector}/toggle`, {}).pipe(
      tap(() => this.refreshData())
    );
  }

  deleteWidget(selector: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${selector}`).pipe(
      tap(() => this.refreshData())
    );
  }

  getWidgetBySelector(selector: string): Observable<WidgetConfig> {
    return this.http.get<WidgetConfig>(`${this.apiUrl}/selector/${selector}`);
  }

  getCurrentLayout(): WidgetLayout | null {
    return this.widgetLayoutSubject.value;
  }

  getCurrentWidgets(): WidgetConfig[] {
    return this.widgetsSubject.value;
  }

  isWidgetEnabled(selector: string): boolean {
    const widgets = this.widgetsSubject.value;
    const widget = widgets.find(w => w.selector === selector);
    return widget?.status === WidgetStatus.ENABLED;
  }

  getWidgetBySelectorFromCache(selector: string): WidgetConfig | undefined {
    const widgets = this.widgetsSubject.value;
    return widgets.find(w => w.selector === selector);
  }

  getWidgetsByPositionFromCache(position: WidgetPosition): WidgetConfig[] {
    const layout = this.widgetLayoutSubject.value;
    if (!layout) return [];
    
    return layout[position] || [];
  }

  canAddWidgetToPosition(position: WidgetPosition, widgetSelector?: string): boolean {
    const layout = this.widgetLayoutSubject.value;
    if (!layout) return true;

    const widgetsInPosition = layout[position] || [];
    const enabledWidgetsInPosition = widgetsInPosition.filter(w => w.status === WidgetStatus.ENABLED);
    
    const currentWidgetInPosition = widgetSelector ? 
      enabledWidgetsInPosition.find(w => w.selector === widgetSelector) : null;
    
    const effectiveCount = currentWidgetInPosition ? 
      enabledWidgetsInPosition.length - 1 : 
      enabledWidgetsInPosition.length;

    return effectiveCount < this.positionLimits[position];
  }

  getPositionLimit(position: WidgetPosition): number {
    return this.positionLimits[position];
  }

  getWidgetsCountInPosition(position: WidgetPosition): number {
    const layout = this.widgetLayoutSubject.value;
    if (!layout) return 0;

    const widgetsInPosition = layout[position] || [];
    return widgetsInPosition.filter(w => w.status === WidgetStatus.ENABLED).length;
  }

  private refreshData(): void {
    // Only refresh if not already loading
    if (!this.isLoading) {
      this.isLoading = true;
      this.getAllWidgets().subscribe();
      this.getWidgetLayout().subscribe();
    }
  }

  initializeData(): void {
    // Only initialize if not already loading and not initialized
    if (!this.isLoading && !this.isInitialized()) {
      this.refreshData();
    }
  }

  forceRefresh(): void {
    this.refreshData();
  }

  getDefaultWidgets(): WidgetConfig[] {
    return this.defaultWidgets;
  }

  isInitialized(): boolean {
    const layout = this.widgetLayoutSubject.value;
    const widgets = this.widgetsSubject.value;
    return layout !== null && widgets.length > 0;
  }

  saveOrUpdateWidget(widget: WidgetConfig): Observable<WidgetConfig> {
    return this.getWidgetBySelector(widget.selector).pipe(
      switchMap(() => {
        // If it reaches here, the widget exists, so update
        return this.updateWidget(widget.selector, widget);
      }),
      catchError((error) => {
        if (error.status === 404) {
          // El widget no existe, crearlo
          return this.createWidget(widget);
        }
        // Re-lanzar otros errores
        throw error;
      })
    );
  }
}
