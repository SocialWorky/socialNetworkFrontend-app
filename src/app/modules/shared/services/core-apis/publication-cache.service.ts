import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { PublicationView } from '@shared/interfaces/publicationView.interface';
import { LogService, LevelLogEnum } from './log.service';

@Injectable({
  providedIn: 'root'
})
export class PublicationCacheService {
  // Cache para publicaciones individuales
  private publicationCache = new Map<string, { publication: PublicationView; timestamp: number }>();
  private readonly PUBLICATION_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
  private readonly MAX_PUBLICATION_CACHE_SIZE = 50;

  // Cache for publication lists
  private publicationListCache = new Map<string, { publications: PublicationView[]; timestamp: number }>();
  private readonly LIST_CACHE_DURATION = 1 * 60 * 1000; // 1 minute

  constructor(private logService: LogService) {
    // Clean expired cache every 5 minutes
    setInterval(() => this.cleanExpiredCache(), 5 * 60 * 1000);
  }

  /**
   * Get publication from cache
   */
  getPublicationFromCache(id: string): PublicationView | null {
    const cached = this.publicationCache.get(id);
    if (cached && this.isCacheValid(cached.timestamp, this.PUBLICATION_CACHE_DURATION)) {

      return cached.publication;
    }
    return null;
  }

  /**
   * Get publication list from cache
   */
  getPublicationListFromCache(cacheKey: string): PublicationView[] | null {
    const cached = this.publicationListCache.get(cacheKey);
    if (cached && this.isCacheValid(cached.timestamp, this.LIST_CACHE_DURATION)) {

      return cached.publications;
    }
    return null;
  }

  /**
   * Add publication to cache
   */
  addPublicationToCache(id: string, publication: PublicationView): void {
    // Remove oldest entries if cache is full
    if (this.publicationCache.size >= this.MAX_PUBLICATION_CACHE_SIZE) {
      const oldestKey = this.publicationCache.keys().next().value;
      this.publicationCache.delete(oldestKey);
    }

    this.publicationCache.set(id, {
      publication,
      timestamp: Date.now()
    });


  }

  /**
   * Add publication list to cache
   */
  addPublicationListToCache(cacheKey: string, publications: PublicationView[]): void {
    // Remove oldest entries if cache is full
    if (this.publicationListCache.size >= this.MAX_PUBLICATION_CACHE_SIZE) {
      const oldestKey = this.publicationListCache.keys().next().value;
      this.publicationListCache.delete(oldestKey);
    }

    this.publicationListCache.set(cacheKey, {
      publications,
      timestamp: Date.now()
    });


  }

  /**
   * Update publication in cache
   */
  updatePublicationInCache(id: string, publication: PublicationView): void {
    const cached = this.publicationCache.get(id);
    if (cached) {
      this.publicationCache.set(id, {
        publication,
        timestamp: Date.now()
      });

    }
  }

  /**
   * Remove publication from cache
   */
  removePublicationFromCache(id: string): void {
    this.publicationCache.delete(id);

  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.publicationCache.clear();
    this.publicationListCache.clear();

  }

  /**
   * Check if cache is valid
   */
  isCacheValid(timestamp: number, duration: number): boolean {
    return Date.now() - timestamp < duration;
  }

  /**
   * Clean expired cache entries
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    let cleanedCount = 0;

    // Clean individual publication cache
    for (const [key, value] of this.publicationCache.entries()) {
      if (!this.isCacheValid(value.timestamp, this.PUBLICATION_CACHE_DURATION)) {
        this.publicationCache.delete(key);
        cleanedCount++;
      }
    }

    // Clean publication list cache
    for (const [key, value] of this.publicationListCache.entries()) {
      if (!this.isCacheValid(value.timestamp, this.LIST_CACHE_DURATION)) {
        this.publicationListCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
  
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { 
    individualCacheSize: number; 
    listCacheSize: number; 
    maxIndividualCache: number; 
    maxListCache: number; 
  } {
    return {
      individualCacheSize: this.publicationCache.size,
      listCacheSize: this.publicationListCache.size,
      maxIndividualCache: this.MAX_PUBLICATION_CACHE_SIZE,
      maxListCache: this.MAX_PUBLICATION_CACHE_SIZE
    };
  }
} 