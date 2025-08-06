import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { LogService, LevelLogEnum } from './core-apis/log.service';

export interface LoadingConfig {
  pageSize: number;
  preloadThreshold: number;
  publicationHeight: number;
  fallbackThreshold: number;
}

export interface LoadingState {
  isLoading: boolean;
  hasMore: boolean;
  currentPage: number;
  totalLoaded: number;
  lastLoadTime: Date | null;
}

@Injectable({
  providedIn: 'root'
})
export class PublicationLoadingService {
  private readonly DEFAULT_CONFIG: LoadingConfig = {
    pageSize: 10,
    preloadThreshold: 5,
    publicationHeight: 300,
    fallbackThreshold: 200
  };

  private loadingState = new BehaviorSubject<LoadingState>({
    isLoading: false,
    hasMore: true,
    currentPage: 1,
    totalLoaded: 0,
    lastLoadTime: null
  });

  constructor(private logService: LogService) {}


  shouldLoadMore(
    scrollEvent: any,
    currentPublications: any[],
    config: Partial<LoadingConfig> = {}
  ): boolean {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    if (currentPublications.length === 0) {
      return false;
    }

    const container = scrollEvent.target;
    const scrollTop = container.scrollTop;
    const clientHeight = container.clientHeight;
    const scrollHeight = container.scrollHeight;

    const visiblePublications = Math.ceil(clientHeight / finalConfig.publicationHeight);
    const currentPublicationIndex = Math.floor(scrollTop / finalConfig.publicationHeight);
    const remainingPublications = currentPublications.length - currentPublicationIndex - visiblePublications;
    
    if (remainingPublications <= finalConfig.preloadThreshold && remainingPublications > 0) {
      this.logService.log(
        LevelLogEnum.DEBUG,
        'PublicationLoadingService',
        'Cargando por threshold de publicaciones',
        {
          remaining: remainingPublications,
          threshold: finalConfig.preloadThreshold,
          currentIndex: currentPublicationIndex,
          visible: visiblePublications
        }
      );
      return true;
    }
    
    const position = scrollTop + clientHeight;
    if (position >= scrollHeight - finalConfig.fallbackThreshold) {
      this.logService.log(
        LevelLogEnum.DEBUG,
        'PublicationLoadingService',
        'Cargando por fallback threshold',
        {
          position,
          scrollHeight,
          threshold: finalConfig.fallbackThreshold
        }
      );
      return true;
    }
    
    return false;
  }


  needsToLoad(
    currentPublications: any[],
    currentPage: number,
    pageSize: number,
    hasMore: boolean
  ): boolean {
    if (!hasMore) {
      return false;
    }

    if (currentPublications.length === 0) {
      return true;
    }

    const totalExpected = currentPage * pageSize;
    if (currentPublications.length >= totalExpected) {
      return false;
    }

    return true;
  }


  updateLoadingState(updates: Partial<LoadingState>): void {
    const currentState = this.loadingState.value;
    const newState = { ...currentState, ...updates };
    
    if (updates.isLoading !== undefined) {
      newState.lastLoadTime = updates.isLoading ? new Date() : currentState.lastLoadTime;
    }
    
    this.loadingState.next(newState);
    
    this.logService.log(
      LevelLogEnum.DEBUG,
      'PublicationLoadingService',
      'Estado de carga actualizado',
      newState
    );
  }


  getLoadingState(): Observable<LoadingState> {
    return this.loadingState.asObservable();
  }


  getCurrentLoadingState(): LoadingState {
    return this.loadingState.value;
  }


  resetLoadingState(): void {
    this.loadingState.next({
      isLoading: false,
      hasMore: true,
      currentPage: 1,
      totalLoaded: 0,
      lastLoadTime: null
    });
  }


  getLoadingProgress(currentPublications: any[], totalExpected?: number): number {
    if (currentPublications.length === 0) return 0;
    
    if (totalExpected) {
      return Math.min((currentPublications.length / totalExpected) * 100, 100);
    }
    
    const estimatedTotal = this.loadingState.value.currentPage * this.DEFAULT_CONFIG.pageSize;
    return Math.min((currentPublications.length / estimatedTotal) * 100, 100);
  }


  isCurrentlyLoading(): boolean {
    return this.loadingState.value.isLoading;
  }


  hasMorePublications(): boolean {
    return this.loadingState.value.hasMore;
  }
} 