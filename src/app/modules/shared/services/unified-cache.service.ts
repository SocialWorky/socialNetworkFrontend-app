import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, interval, takeUntil } from 'rxjs';
import { LogService, LevelLogEnum } from './core-apis/log.service';

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  expiresAt: number;
  tags?: string[];
  version?: string;
}

export interface CacheConfig {
  defaultTTL: number;
  maxEntries: number;
  enablePersistence: boolean;
  cleanupInterval: number;
  version: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}

export type CacheLayer = 'memory' | 'session' | 'local';

const DEFAULT_CONFIG: CacheConfig = {
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxEntries: 200,
  enablePersistence: true,
  cleanupInterval: 60 * 1000, // 1 minute
  version: '2.0.0'
};

const ENDPOINT_TTL_CONFIG: Record<string, number> = {
  '/user/': 10 * 60 * 1000,        // 10 minutes
  '/publication': 3 * 60 * 1000,    // 3 minutes
  '/notification': 1 * 60 * 1000,   // 1 minute
  '/config': 30 * 60 * 1000,        // 30 minutes
  '/friends': 5 * 60 * 1000,        // 5 minutes
  '/thematic-images': 60 * 60 * 1000, // 1 hour
  '/groups': 3 * 60 * 1000,         // 3 minutes
};

const NO_CACHE_PATTERNS = [
  '/auth/login',
  '/auth/logout',
  '/auth/refresh',
  '/message',
  '/websocket',
  '/socket',
  '/records-logs', // Logs should always be read directly from database
];

@Injectable({
  providedIn: 'root'
})
export class UnifiedCacheService implements OnDestroy {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig = DEFAULT_CONFIG;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    maxSize: DEFAULT_CONFIG.maxEntries,
    hitRate: 0,
    oldestEntry: null,
    newestEntry: null
  };

  private stats$ = new BehaviorSubject<CacheStats>(this.stats);
  private destroy$ = new Subject<void>();
  private readonly STORAGE_PREFIX = 'unified_cache_';

  constructor(private logService: LogService) {
    this.initializeCleanupInterval();
    this.loadPersistedCache();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeCleanupInterval(): void {
    interval(this.config.cleanupInterval)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.cleanup());
  }

  private loadPersistedCache(): void {
    if (!this.config.enablePersistence) return;

    try {
      const keys = Object.keys(sessionStorage).filter(k => k.startsWith(this.STORAGE_PREFIX));

      for (const key of keys) {
        const cacheKey = key.replace(this.STORAGE_PREFIX, '');
        const stored = sessionStorage.getItem(key);

        if (stored) {
          try {
            const entry = JSON.parse(stored) as CacheEntry<any>;
            if (this.isValid(entry)) {
              this.memoryCache.set(cacheKey, entry);
            } else {
              sessionStorage.removeItem(key);
            }
          } catch {
            sessionStorage.removeItem(key);
          }
        }
      }

      this.updateStats();
    } catch (error) {
      // Storage not available
    }
  }

  /**
   * Get value from cache
   */
  get<T>(key: string, layer: CacheLayer = 'memory'): T | null {
    const entry = this.getEntry<T>(key, layer);

    if (entry && this.isValid(entry)) {
      this.stats.hits++;
      this.updateHitRate();
      return entry.value;
    }

    this.stats.misses++;
    this.updateHitRate();

    if (entry) {
      this.delete(key, layer);
    }

    return null;
  }

  /**
   * Set value in cache
   */
  set<T>(
    key: string,
    value: T,
    options?: {
      ttl?: number;
      tags?: string[];
      layer?: CacheLayer;
      persist?: boolean;
    }
  ): void {
    const ttl = options?.ttl ?? this.getTTLForKey(key);
    const layer = options?.layer ?? 'memory';
    const persist = options?.persist ?? this.config.enablePersistence;

    if (this.memoryCache.size >= this.config.maxEntries) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      tags: options?.tags,
      version: this.config.version
    };

    this.memoryCache.set(key, entry);

    if (persist && layer !== 'memory') {
      this.persistEntry(key, entry, layer);
    }

    this.updateStats();
  }

  /**
   * Delete from cache
   */
  delete(key: string, layer: CacheLayer = 'memory'): boolean {
    const deleted = this.memoryCache.delete(key);

    if (this.config.enablePersistence) {
      try {
        sessionStorage.removeItem(this.STORAGE_PREFIX + key);
        localStorage.removeItem(this.STORAGE_PREFIX + key);
      } catch {}
    }

    this.updateStats();
    return deleted;
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.memoryCache.get(key);
    return entry !== undefined && this.isValid(entry);
  }

  /**
   * Clear cache by tags
   */
  clearByTags(tags: string[]): number {
    let cleared = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.tags?.some(t => tags.includes(t))) {
        this.delete(key);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Clear cache by pattern (for URL invalidation)
   */
  clearByPattern(pattern: string | RegExp): number {
    let cleared = 0;
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.delete(key);
        cleared++;
      }
    }

    if (this.config.enablePersistence) {
      try {
        const sessionKeys = Object.keys(sessionStorage).filter(k => k.startsWith(this.STORAGE_PREFIX) && regex.test(k.replace(this.STORAGE_PREFIX, '')));
        sessionKeys.forEach(k => sessionStorage.removeItem(k));

        const localKeys = Object.keys(localStorage).filter(k => k.startsWith(this.STORAGE_PREFIX) && regex.test(k.replace(this.STORAGE_PREFIX, '')));
        localKeys.forEach(k => localStorage.removeItem(k));
      } catch {}
    }

    return cleared;
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.memoryCache.clear();

    if (this.config.enablePersistence) {
      try {
        const sessionKeys = Object.keys(sessionStorage).filter(k => k.startsWith(this.STORAGE_PREFIX));
        sessionKeys.forEach(k => sessionStorage.removeItem(k));

        const localKeys = Object.keys(localStorage).filter(k => k.startsWith(this.STORAGE_PREFIX));
        localKeys.forEach(k => localStorage.removeItem(k));
      } catch {}
    }

    this.stats.hits = 0;
    this.stats.misses = 0;
    this.updateStats();
  }

  /**
   * Invalidate cache on mutation (POST/PUT/DELETE)
   */
  invalidateOnMutation(url: string, method: string): void {
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase())) {
      return;
    }

    const resourcePatterns: Record<string, RegExp[]> = {
      '/publication': [/publication/, /feed/],
      '/user': [/user/],
      '/comment': [/comment/, /publication/],
      '/friend': [/friend/],
      '/reaction': [/publication/],
      '/thematic-images': [/thematic/],
      '/config': [/config/],
      '/widgets': [/widgets/],
      '/reports': [/reports/],
      '/groups': [/groups/],
      '/invitations-code': [/invitations/],
      '/boost-packages': [/boost-packages/],
      '/email-templates': [/email-templates/],
      '/subscription-plans': [/subscription-plans/],
      '/subscriptions': [/subscriptions/],
      '/webhooks': [/webhooks/],
      '/custom-reactions': [/custom-reactions/],
    };

    for (const [endpoint, patterns] of Object.entries(resourcePatterns)) {
      if (url.includes(endpoint)) {
        patterns.forEach(pattern => this.clearByPattern(pattern));
        break;
      }
    }
  }

  /**
   * Should this URL be cached?
   */
  shouldCache(url: string): boolean {
    return !NO_CACHE_PATTERNS.some(pattern => url.includes(pattern));
  }

  /**
   * Get cache key for HTTP request
   */
  generateHttpCacheKey(url: string, params?: Record<string, any>): string {
    let key = `http_${url}`;
    if (params && Object.keys(params).length > 0) {
      const sortedParams = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
      key += `?${sortedParams}`;
    }
    return key;
  }

  /**
   * Get observable of cache stats
   */
  getStats$(): Observable<CacheStats> {
    return this.stats$.asObservable();
  }

  /**
   * Get current cache stats
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Update configuration
   */
  configure(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
    this.stats.maxSize = this.config.maxEntries;
    this.updateStats();
  }

  // ===================
  // Private Methods
  // ===================

  private getEntry<T>(key: string, layer: CacheLayer): CacheEntry<T> | null {
    let entry = this.memoryCache.get(key) as CacheEntry<T> | undefined;

    if (!entry && this.config.enablePersistence) {
      entry = this.loadFromStorage<T>(key, layer);
    }

    return entry ?? null;
  }

  private loadFromStorage<T>(key: string, layer: CacheLayer): CacheEntry<T> | undefined {
    try {
      const storage = layer === 'local' ? localStorage : sessionStorage;
      const stored = storage.getItem(this.STORAGE_PREFIX + key);

      if (stored) {
        const entry = JSON.parse(stored) as CacheEntry<T>;
        if (this.isValid(entry)) {
          this.memoryCache.set(key, entry);
          return entry;
        }
        storage.removeItem(this.STORAGE_PREFIX + key);
      }
    } catch {}

    return undefined;
  }

  private persistEntry<T>(key: string, entry: CacheEntry<T>, layer: CacheLayer): void {
    try {
      const storage = layer === 'local' ? localStorage : sessionStorage;
      storage.setItem(this.STORAGE_PREFIX + key, JSON.stringify(entry));
    } catch {
      // Storage quota exceeded, cleanup
      this.cleanupStorage(layer);
    }
  }

  private cleanupStorage(layer: CacheLayer): void {
    try {
      const storage = layer === 'local' ? localStorage : sessionStorage;
      const keys = Object.keys(storage).filter(k => k.startsWith(this.STORAGE_PREFIX));

      // Remove oldest 20%
      const toRemove = Math.ceil(keys.length * 0.2);
      keys.slice(0, toRemove).forEach(k => storage.removeItem(k));
    } catch {}
  }

  private isValid(entry: CacheEntry<any>): boolean {
    if (entry.version !== this.config.version) {
      return false;
    }
    return Date.now() < entry.expiresAt;
  }

  private getTTLForKey(key: string): number {
    for (const [pattern, ttl] of Object.entries(ENDPOINT_TTL_CONFIG)) {
      if (key.includes(pattern)) {
        return ttl;
      }
    }
    return this.config.defaultTTL;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (!this.isValid(entry)) {
        this.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.updateStats();
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  private updateStats(): void {
    let oldestTime = Infinity;
    let newestTime = 0;

    for (const entry of this.memoryCache.values()) {
      if (entry.timestamp < oldestTime) oldestTime = entry.timestamp;
      if (entry.timestamp > newestTime) newestTime = entry.timestamp;
    }

    this.stats.size = this.memoryCache.size;
    this.stats.oldestEntry = this.memoryCache.size > 0 ? oldestTime : null;
    this.stats.newestEntry = this.memoryCache.size > 0 ? newestTime : null;

    this.stats$.next({ ...this.stats });
  }
}
