import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpInterceptor,
  HttpHandler,
  HttpRequest,
  HttpResponse,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, Subject, of, throwError } from 'rxjs';
import { tap, finalize, shareReplay, catchError } from 'rxjs/operators';

interface PendingRequest {
  observable: Observable<HttpEvent<any>>;
  timestamp: number;
}

/**
 * HTTP Request Deduplication Interceptor
 *
 * Prevents duplicate concurrent requests to the same endpoint.
 * If a request is already in flight, subsequent identical requests
 * will share the same response.
 *
 * Features:
 * - Deduplicates GET requests by default
 * - Configurable for other methods
 * - Automatic cleanup of stale requests
 * - Request fingerprinting based on URL, params, and headers
 */
@Injectable()
export class DeduplicationInterceptor implements HttpInterceptor {
  private pendingRequests = new Map<string, PendingRequest>();
  private readonly STALE_REQUEST_TIMEOUT = 30000; // 30 seconds

  /**
   * Methods to deduplicate (GET by default, can add others)
   */
  private readonly DEDUPLICATE_METHODS = ['GET'];

  /**
   * Endpoints to exclude from deduplication
   */
  private readonly EXCLUDE_PATTERNS = [
    '/auth/refresh',
    '/health',
    '/socket',
    '/websocket'
  ];

  constructor() {
    // Cleanup stale requests periodically
    setInterval(() => this.cleanupStaleRequests(), 10000);
  }

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // Only deduplicate configured methods
    if (!this.shouldDeduplicate(request)) {
      return next.handle(request);
    }

    // Generate request fingerprint
    const fingerprint = this.generateFingerprint(request);

    // Check for pending request
    const pending = this.pendingRequests.get(fingerprint);
    if (pending && this.isRequestValid(pending)) {
      return pending.observable;
    }

    // Create new request with sharing
    const sharedRequest$ = next.handle(request).pipe(
      shareReplay({ bufferSize: 1, refCount: false }),
      tap(event => {
        if (event instanceof HttpResponse) {
          // Successful response, will be cleaned up in finalize
        }
      }),
      catchError((error: HttpErrorResponse) => {
        // Remove failed request immediately
        this.pendingRequests.delete(fingerprint);
        return throwError(() => error);
      }),
      finalize(() => {
        // Delay cleanup to allow late subscribers
        setTimeout(() => {
          this.pendingRequests.delete(fingerprint);
        }, 100);
      })
    );

    // Store pending request
    this.pendingRequests.set(fingerprint, {
      observable: sharedRequest$,
      timestamp: Date.now()
    });

    return sharedRequest$;
  }

  /**
   * Check if request should be deduplicated
   */
  private shouldDeduplicate(request: HttpRequest<any>): boolean {
    // Check method
    if (!this.DEDUPLICATE_METHODS.includes(request.method)) {
      return false;
    }

    // Check excluded patterns
    if (this.EXCLUDE_PATTERNS.some(pattern => request.url.includes(pattern))) {
      return false;
    }

    // Check for no-dedup header
    if (request.headers.has('X-No-Dedup')) {
      return false;
    }

    return true;
  }

  /**
   * Generate unique fingerprint for request
   */
  private generateFingerprint(request: HttpRequest<any>): string {
    const parts = [
      request.method,
      request.urlWithParams
    ];

    // Include relevant headers in fingerprint
    const relevantHeaders = ['Authorization', 'Accept-Language'];
    relevantHeaders.forEach(header => {
      const value = request.headers.get(header);
      if (value) {
        parts.push(`${header}:${value}`);
      }
    });

    // For POST/PUT with body, include body hash
    if (request.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      try {
        parts.push(JSON.stringify(request.body));
      } catch {
        // If body can't be serialized, use timestamp to prevent dedup
        parts.push(Date.now().toString());
      }
    }

    return parts.join('|');
  }

  /**
   * Check if pending request is still valid
   */
  private isRequestValid(pending: PendingRequest): boolean {
    return Date.now() - pending.timestamp < this.STALE_REQUEST_TIMEOUT;
  }

  /**
   * Cleanup stale pending requests
   */
  private cleanupStaleRequests(): void {
    const now = Date.now();

    for (const [fingerprint, pending] of this.pendingRequests.entries()) {
      if (!this.isRequestValid(pending)) {
        this.pendingRequests.delete(fingerprint);
      }
    }
  }

  /**
   * Get current pending requests count (for debugging)
   */
  getPendingRequestsCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Clear all pending requests (for testing)
   */
  clearPendingRequests(): void {
    this.pendingRequests.clear();
  }
}
