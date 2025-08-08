import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { LogService } from './core-apis/log.service';
import { LevelLogEnum } from '../enums/levelLog.enum';

export interface MemoryMetrics {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  memoryUsagePercentage: number;
  isHighMemory: boolean;
  timestamp: number;
}

export interface MemoryLeakReport {
  component: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: number;
  details: any;
}

@Injectable({
  providedIn: 'root'
})
export class MemoryAuditService implements OnDestroy {
  private destroy$ = new Subject<void>();
  private memoryMetrics$ = new BehaviorSubject<MemoryMetrics | null>(null);
  private memoryLeaks$ = new BehaviorSubject<MemoryLeakReport[]>([]);
  private auditInterval: any;
  private readonly AUDIT_INTERVAL = 60000; // 1 minute
  private readonly HIGH_MEMORY_THRESHOLD = 0.8; // 80%
  private readonly CRITICAL_MEMORY_THRESHOLD = 0.9; // 90%

  constructor(private logService: LogService) {
    this.startMemoryAudit();
  }

  /**
   * Start memory audit monitoring
   */
  private startMemoryAudit(): void {
    this.auditInterval = setInterval(() => {
      this.performMemoryAudit();
    }, this.AUDIT_INTERVAL);
  }

  /**
   * Perform comprehensive memory audit
   */
  private performMemoryAudit(): void {
    if (!('memory' in performance)) return;

    const memory = (performance as any).memory;
    const metrics: MemoryMetrics = {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      memoryUsagePercentage: memory.usedJSHeapSize / memory.jsHeapSizeLimit,
      isHighMemory: memory.usedJSHeapSize > memory.jsHeapSizeLimit * this.HIGH_MEMORY_THRESHOLD,
      timestamp: Date.now()
    };

    this.memoryMetrics$.next(metrics);

    // Check for high memory usage
    if (metrics.isHighMemory) {
      this.handleHighMemoryUsage(metrics);
    }

    // Check for memory leaks
    this.detectMemoryLeaks();
  }

  /**
   * Handle high memory usage
   */
  private handleHighMemoryUsage(metrics: MemoryMetrics): void {
    const severity = metrics.memoryUsagePercentage > this.CRITICAL_MEMORY_THRESHOLD ? 'high' : 'medium';
    
    this.logService.log(LevelLogEnum.WARN, 'MemoryAuditService', 'High memory usage detected', {
      usagePercentage: metrics.memoryUsagePercentage,
      usedHeap: metrics.usedJSHeapSize,
      heapLimit: metrics.jsHeapSizeLimit,
      severity
    });

    // Trigger cleanup if critical
    if (severity === 'high') {
      this.triggerMemoryCleanup();
    }
  }

  /**
   * Detect potential memory leaks
   */
  private detectMemoryLeaks(): void {
    const leaks: MemoryLeakReport[] = [];

    // Check for uncleaned timeouts/intervals
    this.checkForUncleanedTimers(leaks);

    // Check for large object references
    this.checkForLargeObjects(leaks);

    // Check for event listener leaks
    this.checkForEventListenerLeaks(leaks);

    if (leaks.length > 0) {
      this.memoryLeaks$.next([...this.memoryLeaks$.value, ...leaks]);
      
      leaks.forEach(leak => {
        this.logService.log(LevelLogEnum.WARN, 'MemoryAuditService', 'Memory leak detected', leak);
      });
    }
  }

  /**
   * Check for uncleaned timers
   */
  private checkForUncleanedTimers(leaks: MemoryLeakReport[]): void {
    // This is a simplified check - in a real implementation you'd track all timers
    const activeTimers = (window as any).__activeTimers || 0;
    if (activeTimers > 10) {
      leaks.push({
        component: 'Global',
        issue: 'Too many active timers',
        severity: 'medium',
        timestamp: Date.now(),
        details: { activeTimers }
      });
    }
  }

  /**
   * Check for large objects
   */
  private checkForLargeObjects(leaks: MemoryLeakReport[]): void {
    // Check for large arrays or objects in global scope
    const globalProps = Object.getOwnPropertyNames(window);
    const largeProps = globalProps.filter(prop => {
      const value = (window as any)[prop];
      return value && typeof value === 'object' && 
             (Array.isArray(value) ? value.length > 1000 : 
              Object.keys(value).length > 100);
    });

    if (largeProps.length > 0) {
      leaks.push({
        component: 'Global',
        issue: 'Large objects detected in global scope',
        severity: 'low',
        timestamp: Date.now(),
        details: { largeProps }
      });
    }
  }

  /**
   * Check for event listener leaks
   */
  private checkForEventListenerLeaks(leaks: MemoryLeakReport[]): void {
    // This is a simplified check - in a real implementation you'd track all listeners
    const documentListeners = (document as any).__eventListeners || 0;
    const windowListeners = (window as any).__eventListeners || 0;
    
    if (documentListeners > 50 || windowListeners > 50) {
      leaks.push({
        component: 'Global',
        issue: 'Too many event listeners',
        severity: 'medium',
        timestamp: Date.now(),
        details: { documentListeners, windowListeners }
      });
    }
  }

  /**
   * Trigger memory cleanup
   */
  private triggerMemoryCleanup(): void {
    // Clear non-essential caches
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          if (cacheName.includes('image') || cacheName.includes('media')) {
            caches.delete(cacheName);
          }
        });
      });
    }

    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }


  }

  /**
   * Get memory metrics
   */
  getMemoryMetrics(): Observable<MemoryMetrics | null> {
    return this.memoryMetrics$.asObservable();
  }

  /**
   * Get memory leaks
   */
  getMemoryLeaks(): Observable<MemoryLeakReport[]> {
    return this.memoryLeaks$.asObservable();
  }

  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage(): MemoryMetrics | null {
    return this.memoryMetrics$.value;
  }

  /**
   * Force memory audit
   */
  forceAudit(): void {
    this.performMemoryAudit();
  }

  /**
   * Clear memory leak reports
   */
  clearLeakReports(): void {
    this.memoryLeaks$.next([]);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.auditInterval) {
      clearInterval(this.auditInterval);
      this.auditInterval = null;
    }
  }
} 