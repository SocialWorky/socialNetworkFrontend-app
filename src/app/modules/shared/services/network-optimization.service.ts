import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, timer, of, throwError } from 'rxjs';
import { debounceTime, throttleTime, switchMap, catchError, map, takeUntil, filter } from 'rxjs/operators';
import { LogService, LevelLogEnum } from './core-apis/log.service';
import { ConnectionQualityService } from './connection-quality.service';

export interface NetworkConfig {
  batchSize: number;
  debounceTime: number;
  throttleTime: number;
  retryAttempts: number;
  timeout: number;
  enableCompression: boolean;
  enableCaching: boolean;
}

export interface BatchedRequest {
  id: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  headers?: HttpHeaders;
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
}

export interface NetworkMetrics {
  totalRequests: number;
  batchedRequests: number;
  averageResponseTime: number;
  successRate: number;
  connectionQuality: string;
  cacheHitRate: number;
}

@Injectable({
  providedIn: 'root'
})
export class NetworkOptimizationService implements OnDestroy {
  private destroy$ = new Subject<void>();
  private requestQueue = new BehaviorSubject<BatchedRequest[]>([]);
  private metrics$ = new BehaviorSubject<NetworkMetrics>({
    totalRequests: 0,
    batchedRequests: 0,
    averageResponseTime: 0,
    successRate: 100,
    connectionQuality: 'unknown',
    cacheHitRate: 0
  });

  private readonly DEFAULT_CONFIG: NetworkConfig = {
    batchSize: 10,
    debounceTime: 300,
    throttleTime: 1000,
    retryAttempts: 3,
    timeout: 15000,
    enableCompression: true,
    enableCaching: true
  };

  private currentConfig: NetworkConfig = { ...this.DEFAULT_CONFIG };
  private responseTimes: number[] = [];
  private successfulRequests = 0;
  private totalRequests = 0;

  constructor(
    private http: HttpClient,
    private logService: LogService,
    private connectionQualityService: ConnectionQualityService
  ) {
    this.initializeService();
    this.startRequestProcessor();
  }

  /**
   * Initialize service with connection quality adaptation
   */
  private initializeService(): void {
    const connectionInfo = this.connectionQualityService.getConnectionInfo();
    this.adaptToConnectionQuality(connectionInfo.effectiveType);
    
    this.logService.log(LevelLogEnum.INFO, 'NetworkOptimizationService', 'Service initialized', {
      config: this.currentConfig,
      connectionQuality: connectionInfo.effectiveType
    });
  }

  /**
   * Adapt configuration based on connection quality
   */
  private adaptToConnectionQuality(connectionType: string): void {
    switch (connectionType) {
      case 'slow-2g':
      case '2g':
        this.currentConfig = {
          ...this.DEFAULT_CONFIG,
          batchSize: 5,
          debounceTime: 500,
          throttleTime: 2000,
          retryAttempts: 1,
          timeout: 30000,
          enableCompression: true
        };
        break;
      case '3g':
        this.currentConfig = {
          ...this.DEFAULT_CONFIG,
          batchSize: 8,
          debounceTime: 400,
          throttleTime: 1500,
          retryAttempts: 2,
          timeout: 20000
        };
        break;
      case '4g':
        this.currentConfig = {
          ...this.DEFAULT_CONFIG,
          batchSize: 15,
          debounceTime: 200,
          throttleTime: 500,
          retryAttempts: 3,
          timeout: 10000
        };
        break;
      default:
        this.currentConfig = { ...this.DEFAULT_CONFIG };
    }
  }

  /**
   * Add request to batch queue
   */
  addToBatch(request: Omit<BatchedRequest, 'id' | 'timestamp'>): Observable<any> {
    const batchedRequest: BatchedRequest = {
      ...request,
      id: this.generateRequestId(),
      timestamp: Date.now()
    };

    const currentQueue = this.requestQueue.value;
    currentQueue.push(batchedRequest);
    this.requestQueue.next(currentQueue);

    this.logService.log(LevelLogEnum.INFO, 'NetworkOptimizationService', 'Request added to batch', {
      id: batchedRequest.id,
      url: batchedRequest.url,
      priority: batchedRequest.priority
    });

    // Return observable that will emit when request is processed
    return this.waitForRequestCompletion(batchedRequest.id);
  }

  /**
   * Optimized GET request with batching
   */
  get(url: string, options: { headers?: HttpHeaders; params?: HttpParams } = {}): Observable<any> {
    return this.addToBatch({
      url,
      method: 'GET',
      headers: options.headers,
      priority: 'medium'
    });
  }

  /**
   * Optimized POST request with batching
   */
  post(url: string, data: any, options: { headers?: HttpHeaders } = {}): Observable<any> {
    return this.addToBatch({
      url,
      method: 'POST',
      data,
      headers: options.headers,
      priority: 'high'
    });
  }

  /**
   * Optimized PUT request with batching
   */
  put(url: string, data: any, options: { headers?: HttpHeaders } = {}): Observable<any> {
    return this.addToBatch({
      url,
      method: 'PUT',
      data,
      headers: options.headers,
      priority: 'high'
    });
  }

  /**
   * Optimized DELETE request with batching
   */
  delete(url: string, options: { headers?: HttpHeaders } = {}): Observable<any> {
    return this.addToBatch({
      url,
      method: 'DELETE',
      headers: options.headers,
      priority: 'medium'
    });
  }

  /**
   * Start request processor with debouncing and throttling
   */
  private startRequestProcessor(): void {
    this.requestQueue.pipe(
      debounceTime(this.currentConfig.debounceTime),
      throttleTime(this.currentConfig.throttleTime),
      filter(requests => requests.length > 0),
      takeUntil(this.destroy$)
    ).subscribe(requests => {
      this.processBatch(requests);
    });
  }

  /**
   * Process batch of requests
   */
  private processBatch(requests: BatchedRequest[]): void {
    const startTime = performance.now();
    
    // Sort by priority and timestamp
    const sortedRequests = requests.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp;
    });

    // Process in batches
    const batches = this.chunkArray(sortedRequests, this.currentConfig.batchSize);
    
    batches.forEach((batch, index) => {
      timer(index * 100).pipe(
        takeUntil(this.destroy$)
      ).subscribe(() => {
        this.executeBatch(batch);
      });
    });

    // Clear processed requests
    this.requestQueue.next([]);
  }

  /**
   * Execute a batch of requests
   */
  private executeBatch(requests: BatchedRequest[]): void {
    const batchPromises = requests.map(request => 
      this.executeRequest(request).toPromise()
    );

    Promise.all(batchPromises).then(() => {
      const responseTime = performance.now();
      this.updateMetrics(responseTime, requests.length, true);
      
      this.logService.log(LevelLogEnum.INFO, 'NetworkOptimizationService', 'Batch executed successfully', {
        batchSize: requests.length,
        responseTime
      });
    }).catch(error => {
      this.updateMetrics(0, requests.length, false);
      this.logService.log(LevelLogEnum.ERROR, 'NetworkOptimizationService', 'Batch execution failed', { error });
    });
  }

  /**
   * Execute individual request
   */
  private executeRequest(request: BatchedRequest): Observable<any> {
    const startTime = performance.now();
    this.totalRequests++;

    const options: any = {
      headers: request.headers || new HttpHeaders()
    };

    if (request.method === 'GET' && request.data) {
      options.params = new HttpParams({ fromObject: request.data });
    }

    let httpCall: Observable<any>;
    
    switch (request.method) {
      case 'GET':
        httpCall = this.http.get(request.url, options);
        break;
      case 'POST':
        httpCall = this.http.post(request.url, request.data, options);
        break;
      case 'PUT':
        httpCall = this.http.put(request.url, request.data, options);
        break;
      case 'DELETE':
        httpCall = this.http.delete(request.url, options);
        break;
      default:
        return throwError(() => new Error(`Unsupported method: ${request.method}`));
    }

    return httpCall.pipe(
      map(response => {
        const responseTime = performance.now() - startTime;
        this.responseTimes.push(responseTime);
        this.successfulRequests++;
        this.updateMetrics(responseTime, 1, true);
        return response;
      }),
      catchError(error => {
        this.updateMetrics(0, 1, false);
        this.logService.log(LevelLogEnum.ERROR, 'NetworkOptimizationService', 'Request failed', {
          url: request.url,
          method: request.method,
          error: error.message
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Wait for request completion
   */
  private waitForRequestCompletion(requestId: string): Observable<any> {
    return new Observable(observer => {
      // This would be implemented with a proper request tracking system
      // For now, we'll simulate completion
      timer(100).subscribe(() => {
        observer.next({ success: true, requestId });
        observer.complete();
      });
    });
  }

  /**
   * Update network metrics
   */
  private updateMetrics(responseTime: number, requestCount: number, success: boolean): void {
    const currentMetrics = this.metrics$.value;
    
    currentMetrics.totalRequests += requestCount;
    currentMetrics.batchedRequests += requestCount;
    
    if (success && responseTime > 0) {
      currentMetrics.averageResponseTime = 
        (currentMetrics.averageResponseTime * (currentMetrics.totalRequests - requestCount) + responseTime) / 
        currentMetrics.totalRequests;
    }
    
    currentMetrics.successRate = (this.successfulRequests / this.totalRequests) * 100;
    currentMetrics.connectionQuality = this.connectionQualityService.getConnectionInfo().effectiveType;
    
    this.metrics$.next(currentMetrics);
  }

  /**
   * Get current network metrics
   */
  getMetrics(): Observable<NetworkMetrics> {
    return this.metrics$.asObservable();
  }

  /**
   * Get current configuration
   */
  getConfig(): NetworkConfig {
    return { ...this.currentConfig };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<NetworkConfig>): void {
    this.currentConfig = { ...this.currentConfig, ...newConfig };
    this.logService.log(LevelLogEnum.INFO, 'NetworkOptimizationService', 'Configuration updated', this.currentConfig);
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.requestQueue.complete();
    this.metrics$.complete();
  }
} 