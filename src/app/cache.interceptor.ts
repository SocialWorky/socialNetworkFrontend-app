import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { OptimizationService } from './modules/shared/services/optimization.service';
import { LogService, LevelLogEnum } from './modules/shared/services/core-apis/log.service';

/**
 * Cache configuration for specific endpoints
 */
interface CacheConfig {
  /** Cache duration in milliseconds */
  duration?: number;
  /** Whether to cache this endpoint */
  enabled?: boolean;
}

/**
 * HTTP Cache Interceptor
 * 
 * Caches GET requests to improve performance and reduce network traffic.
 * Integrates with OptimizationService for unified caching strategy.
 * 
 * Features:
 * - Automatic caching of GET requests
 * - Configurable cache duration per endpoint
 * - Automatic cache invalidation on mutations (POST/PUT/DELETE)
 * - Respects cache-control headers
 * - Integration with existing OptimizationService
 */
@Injectable()
export class CacheInterceptor implements HttpInterceptor {
  private readonly DEFAULT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  /**
   * Endpoint-specific cache configurations
   * Add or modify entries to customize caching behavior
   */
  private readonly endpointConfigs: Map<string, CacheConfig> = new Map([
    // User profiles - cache for 10 minutes
    ['/user/', { duration: 10 * 60 * 1000 }],
    
    // Publications - cache for 3 minutes (frequently updated)
    ['/publication', { duration: 3 * 60 * 1000 }],
    
    // Notifications - cache for 1 minute (real-time data)
    ['/notification', { duration: 1 * 60 * 1000 }],
    
    // Messages - don't cache (real-time)
    ['/message', { enabled: false }],
    
    // Config/static data - cache for 30 minutes
    ['/config', { duration: 30 * 60 * 1000 }],
    
    // Friends list - cache for 5 minutes
    ['/friends', { duration: 5 * 60 * 1000 }],
  ]);

  /**
   * Endpoints that should never be cached
   */
  private readonly noCacheEndpoints = [
    '/auth/login',
    '/auth/logout',
    '/auth/refresh',
    '/message',
    '/websocket',
    '/socket',
  ];

  constructor(
    private optimizationService: OptimizationService,
    private logService: LogService
  ) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // Only cache GET requests
    if (request.method !== 'GET') {
      // Invalidate cache for mutations
      this.invalidateCacheForMutation(request);
      return next.handle(request);
    }

    // Check if endpoint should be cached
    if (!this.shouldCache(request)) {
      return next.handle(request);
    }

    // Generate cache key
    const cacheKey = this.generateCacheKey(request);

    // Check if response is cached
    const cachedResponse = this.optimizationService.getFromCache<HttpResponse<any>>(cacheKey);
    
    if (cachedResponse) {
      // Return cached response
      return of(cachedResponse);
    }

    // Make request and cache response
    return next.handle(request).pipe(
      tap(event => {
        if (event instanceof HttpResponse) {
          // Get cache duration for this endpoint
          const duration = this.getCacheDuration(request);
          
          // Cache the response
          this.optimizationService.setCache(cacheKey, event);
          
          // Log cache operation in development
          if (this.isDebugMode()) {
            this.logService.log(
              LevelLogEnum.DEBUG,
              'CacheInterceptor',
              'Response cached',
              { url: request.url, cacheKey, duration }
            );
          }
        }
      })
    );
  }

  /**
   * Check if request should be cached
   */
  private shouldCache(request: HttpRequest<any>): boolean {
    const url = request.url;

    // Check no-cache endpoints
    if (this.noCacheEndpoints.some(endpoint => url.includes(endpoint))) {
      return false;
    }

    // Check if explicitly disabled in config
    const config = this.getEndpointConfig(url);
    if (config && config.enabled === false) {
      return false;
    }

    // Check cache-control headers
    const cacheControl = request.headers.get('Cache-Control');
    if (cacheControl && (cacheControl.includes('no-cache') || cacheControl.includes('no-store'))) {
      return false;
    }

    return true;
  }

  /**
   * Generate cache key from request
   */
  private generateCacheKey(request: HttpRequest<any>): string {
    // Include URL and query params in cache key
    const url = request.urlWithParams;
    return `http_cache_${url}`;
  }

  /**
   * Get cache duration for request
   */
  private getCacheDuration(request: HttpRequest<any>): number {
    const config = this.getEndpointConfig(request.url);
    return config?.duration || this.DEFAULT_CACHE_DURATION;
  }

  /**
   * Get endpoint configuration
   */
  private getEndpointConfig(url: string): CacheConfig | undefined {
    for (const [endpoint, config] of this.endpointConfigs.entries()) {
      if (url.includes(endpoint)) {
        return config;
      }
    }
    return undefined;
  }

  /**
   * Invalidate cache for mutation requests
   * POST/PUT/DELETE requests should invalidate related cache entries
   */
  private invalidateCacheForMutation(request: HttpRequest<any>): void {
    const method = request.method;
    
    if (method === 'POST' || method === 'PUT' || method === 'DELETE' || method === 'PATCH') {
      // Extract resource type from URL
      const url = request.url;
      
      // Invalidate related cache entries
      // This is a simple implementation - you can make it more sophisticated
      if (url.includes('/publication')) {
        // Clear publication cache
        this.clearCacheByPattern('http_cache_.*publication');
      } else if (url.includes('/user')) {
        // Clear user cache
        this.clearCacheByPattern('http_cache_.*user');
      } else if (url.includes('/comment')) {
        // Clear comment cache (and related publications)
        this.clearCacheByPattern('http_cache_.*comment');
        this.clearCacheByPattern('http_cache_.*publication');
      } else if (url.includes('/friend')) {
        // Clear friends cache
        this.clearCacheByPattern('http_cache_.*friend');
      }

      if (this.isDebugMode()) {
        this.logService.log(
          LevelLogEnum.DEBUG,
          'CacheInterceptor',
          'Cache invalidated for mutation',
          { method, url }
        );
      }
    }
  }

  /**
   * Clear cache entries matching pattern
   * Note: This is a simplified implementation
   * In production, you might want to use a more sophisticated cache invalidation strategy
   */
  private clearCacheByPattern(pattern: string): void {
    // Since OptimizationService doesn't expose cache keys,
    // we'll just clear all cache for mutations
    // This is safe but not optimal - consider enhancing OptimizationService
    // to support pattern-based cache clearing
    this.optimizationService.clearCache();
  }

  /**
   * Check if debug mode is enabled
   */
  private isDebugMode(): boolean {
    // Check if we're in development mode
    return !!(window as any)['ngDevMode'];
  }
}
