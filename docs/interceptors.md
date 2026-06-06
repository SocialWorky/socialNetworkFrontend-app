# HTTP Interceptors — socialNetworkFrontend-app

8 interceptors are registered in `app.module.ts` in this exact order. Do not bypass or reorder them.

## 1. AuthInterceptor

**File:** `src/app/auth.interceptor.ts`

Injects the JWT access token into every outbound request as `Authorization: Bearer <token>`.

On `401` responses: queues the failed request, triggers a token refresh, then replays all queued requests with the new token. Prevents race conditions when multiple requests fail simultaneously.

## 2. DeduplicationInterceptor

**File:** `src/app/deduplication.interceptor.ts`

Prevents duplicate concurrent `GET` requests to the same URL. If a matching in-flight request exists, subsequent callers subscribe to its observable instead of issuing a new HTTP call. The in-flight map is cleared when the request completes or errors.

## 3. CacheInterceptor

**File:** `src/app/cache.interceptor.ts`

Multi-layer cache backed by `UnifiedCacheService` (memory → session storage → local storage, max 200 entries).

TTLs by resource type: user 10min · publication 3min · notification 1min · config 30min · friends 5min · thematic-images 60min.

Supports tag-based invalidation — mutating operations can bust related cache entries by tag.

## 4. TimeoutInterceptor

**File:** `src/app/timeout.interceptor.ts`

Applies a 15-second timeout to every request. On timeout or `0 / 408 / 429 / 5xx` status codes, retries up to 2 times with exponential backoff before propagating the error.

## 5. SafariIOSErrorInterceptor

**File:** `src/app/safari-ios-error.interceptor.ts`

Silences two Safari-specific failures that are not actionable:
- IndexedDB access errors (thrown in Private Browsing mode)
- Image `404` errors from Safari's strict origin policy

## 6. GoogleImageErrorInterceptor

**File:** `src/app/google-image-error.interceptor.ts`

Blocks requests to Google user content CDN domains (`lh3 / lh4 / lh5 / lh6.googleusercontent.com`) that would fail with CORS errors. Returns an empty observable instead of letting the error surface.

## 7. Silent404Interceptor

**File:** `src/app/silent-404.interceptor.ts`

Suppresses `404` responses specifically from `GET /app/version`. This endpoint is polled for forced-update checks and may legitimately be absent on older server deployments.

## 8. ExternalServiceErrorInterceptor

**File:** `src/app/external-service-error.interceptor.ts`

Swallows `0 / 502 / 503 / 504` errors from external services (geolocation, weather APIs). These are non-critical features and should fail silently rather than surfacing error UI.
