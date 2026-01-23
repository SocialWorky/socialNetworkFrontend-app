import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpResponse, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { UnifiedCacheService } from './modules/shared/services/unified-cache.service';

/**
 * HTTP Cache Interceptor
 *
 * Caches GET requests using the UnifiedCacheService.
 * Automatically invalidates cache on mutations.
 */
@Injectable()
export class CacheInterceptor implements HttpInterceptor {

  constructor(private cacheService: UnifiedCacheService) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // Only cache GET requests
    if (request.method !== 'GET') {
      this.cacheService.invalidateOnMutation(request.url, request.method);
      return next.handle(request);
    }

    // Check if endpoint should be cached
    if (!this.cacheService.shouldCache(request.url)) {
      return next.handle(request);
    }

    // Check cache-control headers
    const cacheControl = request.headers.get('Cache-Control');
    if (cacheControl && (cacheControl.includes('no-cache') || cacheControl.includes('no-store'))) {
      return next.handle(request);
    }

    // Generate cache key
    const cacheKey = this.cacheService.generateHttpCacheKey(request.urlWithParams);

    // Check cache
    const cachedResponse = this.cacheService.get<HttpResponse<any> | any>(cacheKey);

    if (cachedResponse) {
      // Ensure we have a valid HttpResponse object
      if (cachedResponse instanceof HttpResponse) {
        return of(cachedResponse.clone());
      } else if (cachedResponse && typeof (cachedResponse as any).clone === 'function') {
        return of((cachedResponse as any).clone());
      } else if (cachedResponse && typeof cachedResponse === 'object' && 'body' in cachedResponse) {
        // Reconstruct HttpResponse from cached data (when deserialized from storage)
        try {
          const cachedData = cachedResponse as any;
          const reconstructed = new HttpResponse({
            body: cachedData.body,
            status: cachedData.status || 200,
            statusText: cachedData.statusText || 'OK',
            headers: cachedData.headers ? new HttpHeaders(cachedData.headers) : new HttpHeaders(),
            url: cachedData.url || request.urlWithParams
          });
          return of(reconstructed);
        } catch (error) {
          // If reconstruction fails, remove from cache and make new request
          this.cacheService.delete(cacheKey);
        }
      } else {
        // If cached response is not valid, remove from cache and make new request
        this.cacheService.delete(cacheKey);
      }
    }

    // Make request and cache response
    return next.handle(request).pipe(
      tap(event => {
        if (event instanceof HttpResponse && event.status === 200) {
          this.cacheService.set(cacheKey, event.clone(), {
            tags: this.extractTags(request.url),
            layer: 'session',
            persist: true
          });
        }
      })
    );
  }

  private extractTags(url: string): string[] {
    const tags: string[] = [];

    if (url.includes('/publication')) tags.push('publication');
    if (url.includes('/user')) tags.push('user');
    if (url.includes('/comment')) tags.push('comment');
    if (url.includes('/friend')) tags.push('friend');
    if (url.includes('/notification')) tags.push('notification');
    if (url.includes('/config')) tags.push('config');
    if (url.includes('/thematic')) tags.push('thematic');

    return tags;
  }
}
