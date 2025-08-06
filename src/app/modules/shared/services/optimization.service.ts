import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { debounceTime, throttleTime, distinctUntilChanged, filter, shareReplay } from 'rxjs/operators';
import { LogService, LevelLogEnum } from './core-apis/log.service';
import { tap } from 'rxjs/operators';

export interface OptimizationConfig {
  debounceTime?: number;
  throttleTime?: number;
  maxConcurrentCalls?: number;
  cacheDuration?: number;
}

export interface CallTracker {
  endpoint: string;
  timestamp: number;
  count: number;
}

@Injectable({
  providedIn: 'root'
})
export class OptimizationService {
  private readonly DEFAULT_DEBOUNCE_TIME = 300; // 300ms
  private readonly DEFAULT_THROTTLE_TIME = 1000; // 1 second
  private readonly DEFAULT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CONCURRENT_CALLS = 5;

  // Cache for responses
  private responseCache = new Map<string, { data: any; timestamp: number }>();
  
  // Call tracking
  private callTracker = new Map<string, CallTracker>();
  
  // Subject for optimized searches
  private searchSubject = new BehaviorSubject<string>('');
  
  // Subject for optimized scroll
  private scrollSubject = new Subject<number>();
  
  // Concurrent calls control
  private activeCalls = new Set<string>();
  private callQueue: Array<{ id: string; fn: () => void }> = [];

  constructor(private logService: LogService) {
    this.setupOptimizedSearch();
    this.setupOptimizedScroll();
  }

  /**
   * Setup optimized search with debounce
   */
  private setupOptimizedSearch(): void {
    this.searchSubject.pipe(
      debounceTime(this.DEFAULT_DEBOUNCE_TIME),
      distinctUntilChanged(),
      filter(query => query.length >= 2) // Minimum 2 characters
    ).subscribe(query => {
      // Search optimization handled silently
    });
  }

  /**
   * Setup optimized scroll with throttle
   */
  private setupOptimizedScroll(): void {
    this.scrollSubject.pipe(
      throttleTime(this.DEFAULT_THROTTLE_TIME)
    ).subscribe(position => {
      // Scroll optimization handled silently
    });
  }

  /**
   * Emit optimized search
   */
  emitSearch(query: string): void {
    this.searchSubject.next(query);
  }

  /**
   * Emit optimized scroll
   */
  emitScroll(position: number): void {
    this.scrollSubject.next(position);
  }

  /**
   * Get optimized search observable
   */
  getOptimizedSearch(): Observable<string> {
    return this.searchSubject.asObservable().pipe(
      debounceTime(this.DEFAULT_DEBOUNCE_TIME),
      distinctUntilChanged(),
      shareReplay(1)
    );
  }

  /**
   * Get optimized scroll observable
   */
  getOptimizedScroll(): Observable<number> {
    return this.scrollSubject.asObservable().pipe(
      throttleTime(this.DEFAULT_THROTTLE_TIME),
      shareReplay(1)
    );
  }

  /**
   * Check if a call is cached
   */
  isCached(key: string): boolean {
    const cached = this.responseCache.get(key);
    if (!cached) return false;
    
    return Date.now() - cached.timestamp < this.DEFAULT_CACHE_DURATION;
  }

  /**
   * Get data from cache
   */
  getFromCache<T>(key: string): T | null {
    const cached = this.responseCache.get(key);
    if (!cached || Date.now() - cached.timestamp >= this.DEFAULT_CACHE_DURATION) {
      return null;
    }
    

    
    return cached.data as T;
  }

  /**
   * Save data to cache
   */
  setCache<T>(key: string, data: T): void {
    // Clean cache if full (maximum 100 entries)
    if (this.responseCache.size >= 100) {
      this.cleanExpiredCache();
      if (this.responseCache.size >= 100) {
        const oldestKey = this.responseCache.keys().next().value;
        this.responseCache.delete(oldestKey);
      }
    }

    this.responseCache.set(key, {
      data,
      timestamp: Date.now()
    });


  }

  /**
   * Check if there are too many calls to the same endpoint
   */
  isCallRateLimited(endpoint: string): boolean {
    const tracker = this.callTracker.get(endpoint);
    if (!tracker) return false;

    const timeDiff = Date.now() - tracker.timestamp;
    const isRecent = timeDiff < 60000; // 1 minute
    const isFrequent = tracker.count > 10; // More than 10 calls per minute

    if (isRecent && isFrequent) {
      this.logService.log(
        LevelLogEnum.WARN,
        'OptimizationService',
        'Call rate limited',
        { endpoint, count: tracker.count, timeDiff }
      );
      return true;
    }

    return false;
  }

  /**
   * Track a call to an endpoint
   */
  trackCall(endpoint: string): void {
    const now = Date.now();
    const tracker = this.callTracker.get(endpoint);

    if (tracker && now - tracker.timestamp < 60000) {
      // Within the same minute
      tracker.count++;
    } else {
      // New minute
      this.callTracker.set(endpoint, {
        endpoint,
        timestamp: now,
        count: 1
      });
    }
  }

  /**
   * Check if there are too many concurrent calls
   */
  canMakeCall(callId: string): boolean {
    if (this.activeCalls.size >= this.MAX_CONCURRENT_CALLS) {
      this.logService.log(
        LevelLogEnum.WARN,
        'OptimizationService',
        'Too many concurrent calls',
        { activeCalls: this.activeCalls.size, maxCalls: this.MAX_CONCURRENT_CALLS }
      );
      return false;
    }

    return true;
  }

  /**
   * Register call start
   */
  startCall(callId: string): void {
    this.activeCalls.add(callId);
    this.trackCall(callId);
  }

  /**
   * Register call end
   */
  endCall(callId: string): void {
    this.activeCalls.delete(callId);
    
    // Process call queue
    if (this.callQueue.length > 0) {
      const nextCall = this.callQueue.shift();
      if (nextCall) {
        this.startCall(nextCall.id);
        nextCall.fn();
      }
    }
  }

  /**
   * Execute function with concurrency control
   */
  executeWithConcurrencyControl<T>(
    callId: string, 
    fn: () => Promise<T> | Observable<T>
  ): Promise<T> | Observable<T> {
    if (this.canMakeCall(callId)) {
      this.startCall(callId);
      
      const result = fn();
      
      if (result instanceof Promise) {
        return result.finally(() => this.endCall(callId));
      } else {
        return result.pipe(
          tap({
            finalize: () => this.endCall(callId)
          })
        );
      }
    } else {
      // Add to queue
      return new Promise((resolve, reject) => {
        this.callQueue.push({
          id: callId,
          fn: () => {
            this.executeWithConcurrencyControl(callId, fn)
              .then(resolve)
              .catch(reject);
          }
        });
      });
    }
  }

  /**
   * Clean expired cache
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.responseCache.entries()) {
      if (now - cached.timestamp >= this.DEFAULT_CACHE_DURATION) {
        this.responseCache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.responseCache.clear();
    this.logService.log(
      LevelLogEnum.INFO,
      'OptimizationService',
      'Cache cleared'
    );
  }

  /**
   * Clear call tracking
   */
  clearCallTracking(): void {
    this.callTracker.clear();
    this.activeCalls.clear();
    this.callQueue = [];
    this.logService.log(
      LevelLogEnum.INFO,
      'OptimizationService',
      'Call tracking cleared'
    );
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStats(): {
    cacheSize: number;
    activeCalls: number;
    callQueueLength: number;
    trackedEndpoints: number;
  } {
    return {
      cacheSize: this.responseCache.size,
      activeCalls: this.activeCalls.size,
      callQueueLength: this.callQueue.length,
      trackedEndpoints: this.callTracker.size
    };
  }

  /**
   * Configure custom optimization
   */
  configureOptimization(config: OptimizationConfig): void {
    if (config.debounceTime) {
      // Reconfigure search with new debounce
      this.setupOptimizedSearch();
    }

    this.logService.log(
      LevelLogEnum.INFO,
      'OptimizationService',
      'Optimization configured',
      config
    );
  }
} 