import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { throttleTime, distinctUntilChanged } from 'rxjs/operators';
import { LogService, LevelLogEnum } from './core-apis/log.service';

export interface ScrollOptimizationConfig {
  throttleTime: number;
  scrollThreshold: number;
  loadDelay: number;
  maxConcurrentLoads: number;
  preloadThreshold: number;
  maxLoadsPerMinute: number; // NEW: Limit loads per minute
}

@Injectable({
  providedIn: 'root'
})
export class ScrollOptimizationService {
  private readonly MOBILE_CONFIG: ScrollOptimizationConfig = {
    throttleTime: 500, // Increased from 300ms to 500ms
    scrollThreshold: 200, // Increased from 100 to 200
    loadDelay: 1000, // Increased from 500ms to 1000ms
    maxConcurrentLoads: 1, // Reduced from 2 to 1
    preloadThreshold: 1, // Reduced from 3 to 1
    maxLoadsPerMinute: 5 // NEW: Maximum 5 loads per minute
  };

  private readonly DESKTOP_CONFIG: ScrollOptimizationConfig = {
    throttleTime: 400, // Increased from 200ms to 400ms
    scrollThreshold: 100, // Increased from 50 to 100
    loadDelay: 800, // Increased from 300ms to 800ms
    maxConcurrentLoads: 2, // Reduced from 3 to 2
    preloadThreshold: 2, // Reduced from 5 to 2
    maxLoadsPerMinute: 10 // NEW: Maximum 10 loads per minute
  };

  private isMobileDevice = false;
  private currentLoads = 0;
  private loadHistory: number[] = []; // NEW: Track load times
  private scrollSubject = new Subject<any>();
  private scrollOptimized$ = this.scrollSubject.asObservable().pipe(
    throttleTime(this.getCurrentConfig().throttleTime),
    distinctUntilChanged((prev, curr) => {
      const config = this.getCurrentConfig();
      return Math.abs(prev.scrollTop - curr.scrollTop) < config.scrollThreshold;
    })
  );

  constructor(
    private logService: LogService
  ) {
    this.detectDevice();
    this.startLoadHistoryCleanup();
  }

  private detectDevice(): void {
    this.isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  private getCurrentConfig(): ScrollOptimizationConfig {
    return this.isMobileDevice ? this.MOBILE_CONFIG : this.DESKTOP_CONFIG;
  }

  /**
   * NEW: Start cleanup of load history every minute
   */
  private startLoadHistoryCleanup(): void {
    setInterval(() => {
      const oneMinuteAgo = Date.now() - 60000;
      this.loadHistory = this.loadHistory.filter(time => time > oneMinuteAgo);
    }, 60000); // Every minute
  }

  /**
   * NEW: Check if we can load more based on rate limiting
   */
  private canLoadMore(): boolean {
    const config = this.getCurrentConfig();
    const oneMinuteAgo = Date.now() - 60000;
    const recentLoads = this.loadHistory.filter(time => time > oneMinuteAgo).length;
    
    return recentLoads < config.maxLoadsPerMinute && this.currentLoads < config.maxConcurrentLoads;
  }

  /**
   * NEW: Record a load attempt
   */
  private recordLoad(): void {
    this.loadHistory.push(Date.now());
    this.currentLoads++;
    
    // Auto-decrease after delay
    setTimeout(() => {
      this.currentLoads = Math.max(0, this.currentLoads - 1);
    }, this.getCurrentConfig().loadDelay);
  }

  /**
   * Get optimized scroll observable
   */
  getOptimizedScroll() {
    return this.scrollOptimized$;
  }

  /**
   * Handle scroll event with strict optimization
   */
  handleScroll(event: any, callback: () => void): void {
    const config = this.getCurrentConfig();
    
    // Check if we can load more content
    if (!this.canLoadMore()) {
      this.logService.log(LevelLogEnum.DEBUG, 'ScrollOptimizationService', 'Load blocked due to rate limiting', {
        currentLoads: this.currentLoads,
        recentLoads: this.loadHistory.length,
        maxConcurrent: config.maxConcurrentLoads,
        maxPerMinute: config.maxLoadsPerMinute
      });
      return;
    }

    const element = event.target;
    const scrollTop = element.scrollTop;
    const clientHeight = element.clientHeight;
    const scrollHeight = element.scrollHeight;
    
    // Calculate if we should load more with larger threshold
    const threshold = 800; // Increased from 500 to 800
    const position = scrollTop + clientHeight;
    
    if (position >= scrollHeight - threshold) {
      this.recordLoad();
      
      // Add delay to prevent rapid loading
      setTimeout(() => {
        callback();
      }, config.loadDelay);
    }
  }

  /**
   * Handle scroll for infinite scroll with strict limits
   */
  handleInfiniteScroll(
    event: any, 
    currentItems: any[], 
    hasMore: boolean, 
    isLoading: boolean,
    loadCallback: () => void
  ): void {
    if (isLoading || !hasMore || currentItems.length === 0) {
      return;
    }

    const config = this.getCurrentConfig();
    
    // Check if we can load more content
    if (!this.canLoadMore()) {
      this.logService.log(LevelLogEnum.DEBUG, 'ScrollOptimizationService', 'Infinite scroll blocked due to rate limiting', {
        currentLoads: this.currentLoads,
        recentLoads: this.loadHistory.length,
        maxConcurrent: config.maxConcurrentLoads,
        maxPerMinute: config.maxLoadsPerMinute
      });
      return;
    }

    const element = event.target;
    const scrollTop = element.scrollTop;
    const clientHeight = element.clientHeight;
    const scrollHeight = element.scrollHeight;
    
    // Optimized calculation for infinite scroll with larger threshold
    const itemHeight = 500; // Increased from 400 to 500
    const currentItemIndex = Math.floor(scrollTop / itemHeight);
    const visibleItems = Math.ceil(clientHeight / itemHeight);
    const remainingItems = currentItems.length - currentItemIndex - visibleItems;
    
    // Load more items when approaching the end with larger threshold
    if (remainingItems <= 15 && remainingItems > 0) { // Increased from 10 to 15
      this.recordLoad();
      
      // Add delay to prevent rapid loading
      setTimeout(() => {
        loadCallback();
      }, config.loadDelay);
    }
    
    // Alternative threshold-based loading with larger threshold
    const threshold = 800; // Increased from 500 to 800
    const position = scrollTop + clientHeight;
    if (position >= scrollHeight - threshold) {
      this.recordLoad();
      
      // Add delay to prevent rapid loading
      setTimeout(() => {
        loadCallback();
      }, config.loadDelay);
    }
  }

  /**
   * Optimize image preloading with strict limits
   */
  optimizeImagePreload(
    items: any[], 
    preloadCallback: (item: any) => void,
    imageField: string = 'media'
  ): void {
    const config = this.getCurrentConfig();
    
    // Only preload images for visible items with strict limit
    const visibleItems = items.slice(-Math.min(config.preloadThreshold, 1)); // Maximum 1 item
    
    visibleItems.forEach(item => {
      if (item[imageField] && item[imageField].length > 0) {
        // Only preload first image to reduce load
        const firstMedia = item[imageField][0];
        if (firstMedia && firstMedia.url) {
          preloadCallback(item);
        }
      }
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): ScrollOptimizationConfig {
    return this.getCurrentConfig();
  }

  /**
   * Check if device is mobile
   */
  isMobile(): boolean {
    return this.isMobileDevice;
  }

  /**
   * Reset load counter
   */
  resetLoadCounter(): void {
    this.currentLoads = 0;
    this.loadHistory = [];
  }

  /**
   * Get current load count
   */
  getCurrentLoads(): number {
    return this.currentLoads;
  }

  /**
   * Get max concurrent loads
   */
  getMaxConcurrentLoads(): number {
    return this.getCurrentConfig().maxConcurrentLoads;
  }

  /**
   * NEW: Get load statistics
   */
  getLoadStats(): any {
    const config = this.getCurrentConfig();
    const oneMinuteAgo = Date.now() - 60000;
    const recentLoads = this.loadHistory.filter(time => time > oneMinuteAgo).length;
    
    return {
      currentLoads: this.currentLoads,
      maxConcurrentLoads: config.maxConcurrentLoads,
      recentLoads: recentLoads,
      maxLoadsPerMinute: config.maxLoadsPerMinute,
      loadHistoryLength: this.loadHistory.length,
      canLoadMore: this.canLoadMore()
    };
  }

  /**
   * NEW: Force cleanup
   */
  forceCleanup(): void {
    this.currentLoads = 0;
    this.loadHistory = [];
    this.logService.log(LevelLogEnum.INFO, 'ScrollOptimizationService', 'Forced cleanup completed');
  }
}
