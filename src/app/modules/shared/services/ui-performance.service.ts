import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, fromEvent, merge } from 'rxjs';
import { debounceTime, throttleTime, takeUntil, filter, map } from 'rxjs/operators';
import { LogService, LevelLogEnum } from './core-apis/log.service';

export interface UIPerformanceConfig {
  enableVirtualScrolling: boolean;
  enableSmoothAnimations: boolean;
  enableAccessibility: boolean;
  enableIntersectionObserver: boolean;
  animationDuration: number;
  scrollThrottle: number;
  resizeThrottle: number;
}

export interface UIPerformanceMetrics {
  scrollEvents: number;
  resizeEvents: number;
  animationFrames: number;
  accessibilityChecks: number;
  virtualScrollItems: number;
  averageFrameTime: number;
}

export interface VirtualScrollConfig {
  itemHeight: number;
  containerHeight: number;
  bufferSize: number;
  enableDynamicHeight: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UIPerformanceService implements OnDestroy {
  private destroy$ = new Subject<void>();
  private metrics$ = new BehaviorSubject<UIPerformanceMetrics>({
    scrollEvents: 0,
    resizeEvents: 0,
    animationFrames: 0,
    accessibilityChecks: 0,
    virtualScrollItems: 0,
    averageFrameTime: 0
  });

  private readonly DEFAULT_CONFIG: UIPerformanceConfig = {
    enableVirtualScrolling: true,
    enableSmoothAnimations: true,
    enableAccessibility: true,
    enableIntersectionObserver: true,
    animationDuration: 300,
    scrollThrottle: 16, // 60fps
    resizeThrottle: 100
  };

  private currentConfig: UIPerformanceConfig = { ...this.DEFAULT_CONFIG };
  private frameTimeMeasurements: number[] = [];
  private lastFrameTime = 0;

  constructor(private logService: LogService) {
    this.initializeService();
  }

  /**
   * Initialize service with performance monitoring
   */
  private initializeService(): void {
    this.setupPerformanceMonitoring();
    this.setupEventOptimization();
    this.setupAccessibilityMonitoring();
    

  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    // Monitor frame rate
    let frameCount = 0;
    const frameCounter = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (this.lastFrameTime > 0) {
        const frameTime = currentTime - this.lastFrameTime;
        this.frameTimeMeasurements.push(frameTime);
        
        // Keep only last 60 measurements
        if (this.frameTimeMeasurements.length > 60) {
          this.frameTimeMeasurements.shift();
        }
        
        this.updateMetrics({
          animationFrames: frameCount,
          averageFrameTime: this.calculateAverageFrameTime()
        });
      }
      
      this.lastFrameTime = currentTime;
      requestAnimationFrame(frameCounter);
    };
    
    requestAnimationFrame(frameCounter);
  }

  /**
   * Setup event optimization
   */
  private setupEventOptimization(): void {
    // Optimize scroll events
    const scrollEvents$ = fromEvent(window, 'scroll').pipe(
      throttleTime(this.currentConfig.scrollThrottle),
      takeUntil(this.destroy$)
    );

    // Optimize resize events
    const resizeEvents$ = fromEvent(window, 'resize').pipe(
      debounceTime(this.currentConfig.resizeThrottle),
      takeUntil(this.destroy$)
    );

    // Monitor events
    merge(scrollEvents$, resizeEvents$).pipe(
      takeUntil(this.destroy$)
    ).subscribe(event => {
      const eventType = event.type;
      const currentMetrics = this.metrics$.value;
      
      if (eventType === 'scroll') {
        this.updateMetrics({ scrollEvents: currentMetrics.scrollEvents + 1 });
      } else if (eventType === 'resize') {
        this.updateMetrics({ resizeEvents: currentMetrics.resizeEvents + 1 });
      }
    });
  }

  /**
   * Setup accessibility monitoring
   */
  private setupAccessibilityMonitoring(): void {
    // Monitor focus changes for accessibility
    const focusEvents$ = fromEvent(document, 'focusin').pipe(
      takeUntil(this.destroy$)
    );

    focusEvents$.subscribe(() => {
      const currentMetrics = this.metrics$.value;
      this.updateMetrics({ accessibilityChecks: currentMetrics.accessibilityChecks + 1 });
    });
  }

  /**
   * Calculate virtual scroll items
   */
  calculateVirtualScrollItems(
    totalItems: number,
    config: VirtualScrollConfig
  ): { startIndex: number; endIndex: number; visibleItems: number } {
    const { itemHeight, containerHeight, bufferSize } = config;
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const bufferCount = bufferSize * 2; // Buffer above and below
    
    return {
      startIndex: Math.max(0, Math.floor(window.scrollY / itemHeight) - bufferSize),
      endIndex: Math.min(totalItems, Math.ceil(window.scrollY / containerHeight) + visibleCount + bufferSize),
      visibleItems: visibleCount + bufferCount
    };
  }

  /**
   * Optimize animations with requestAnimationFrame
   */
  animateElement(
    element: HTMLElement,
    properties: { [key: string]: string },
    duration: number = this.currentConfig.animationDuration
  ): Promise<void> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const startValues: { [key: string]: number } = {};
      const endValues: { [key: string]: number } = {};
      
      // Get start values
      const computedStyle = window.getComputedStyle(element);
      Object.keys(properties).forEach(prop => {
        startValues[prop] = parseFloat(computedStyle.getPropertyValue(prop)) || 0;
        endValues[prop] = parseFloat(properties[prop]) || 0;
      });

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out)
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        
        // Apply interpolated values
        Object.keys(properties).forEach(prop => {
          const startValue = startValues[prop];
          const endValue = endValues[prop];
          const currentValue = startValue + (endValue - startValue) * easedProgress;
          element.style.setProperty(prop, `${currentValue}px`);
        });
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      requestAnimationFrame(animate);
    });
  }

  /**
   * Check accessibility compliance
   */
  checkAccessibility(element: HTMLElement): { compliant: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check for alt text on images
    const images = element.querySelectorAll('img');
    images.forEach(img => {
      if (!img.alt && !img.getAttribute('aria-label')) {
        issues.push('Image missing alt text or aria-label');
      }
    });
    
    // Check for proper heading structure
    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;
    headings.forEach(heading => {
      const level = parseInt(heading.tagName.charAt(1));
      if (level > previousLevel + 1) {
        issues.push(`Heading level skipped: ${heading.tagName}`);
      }
      previousLevel = level;
    });
    
    // Check for proper focus management
    const focusableElements = element.querySelectorAll('button, input, select, textarea, a[href], [tabindex]');
    focusableElements.forEach(el => {
      if (el.getAttribute('tabindex') === '-1' && !el.getAttribute('aria-hidden')) {
        issues.push('Focusable element with tabindex="-1" should have aria-hidden="true"');
      }
    });
    
    return {
      compliant: issues.length === 0,
      issues
    };
  }

  /**
   * Optimize intersection observer for lazy loading
   */
  createIntersectionObserver(
    callback: IntersectionObserverCallback,
    options: IntersectionObserverInit = {}
  ): IntersectionObserver {
    const defaultOptions: IntersectionObserverInit = {
      root: null,
      rootMargin: '50px',
      threshold: 0.1,
      ...options
    };
    
    return new IntersectionObserver(callback, defaultOptions);
  }

  /**
   * Optimize scroll performance
   */
  optimizeScroll(container: HTMLElement): void {
    // Add CSS optimizations
    container.style.willChange = 'transform';
    container.style.transform = 'translateZ(0)'; // Force hardware acceleration
    
    // Monitor scroll performance
    let scrollCount = 0;
    const scrollHandler = () => {
      scrollCount++;
      if (scrollCount % 10 === 0) { // Log every 10th scroll

      }
    };
    
    container.addEventListener('scroll', scrollHandler, { passive: true });
  }

  /**
   * Get current metrics
   */
  getMetrics(): Observable<UIPerformanceMetrics> {
    return this.metrics$.asObservable();
  }

  /**
   * Get current configuration
   */
  getConfig(): UIPerformanceConfig {
    return { ...this.currentConfig };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<UIPerformanceConfig>): void {
    this.currentConfig = { ...this.currentConfig, ...newConfig };

  }

  /**
   * Update metrics
   */
  private updateMetrics(updates: Partial<UIPerformanceMetrics>): void {
    const currentMetrics = this.metrics$.value;
    this.metrics$.next({ ...currentMetrics, ...updates });
  }

  /**
   * Calculate average frame time
   */
  private calculateAverageFrameTime(): number {
    if (this.frameTimeMeasurements.length === 0) return 0;
    
    const sum = this.frameTimeMeasurements.reduce((acc, val) => acc + val, 0);
    return sum / this.frameTimeMeasurements.length;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.metrics$.complete();
  }
} 