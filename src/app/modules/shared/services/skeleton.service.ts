import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { LogService, LevelLogEnum } from './core-apis/log.service';

export interface SkeletonConfig {
  type: 'publication' | 'profile' | 'comment' | 'list-item' | 'card';
  count: number;
  showMedia?: boolean;
  animated?: boolean;
}

export interface LoadingState {
  isLoading: boolean;
  skeletonConfig?: SkeletonConfig;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SkeletonService {
  private loadingStates = new Map<string, BehaviorSubject<LoadingState>>();
  private globalLoadingState = new BehaviorSubject<LoadingState>({
    isLoading: false
  });

  constructor(private logService: LogService) {}

  startLoading(componentId: string, config?: SkeletonConfig, message?: string): void {
    const state: LoadingState = {
      isLoading: true,
      skeletonConfig: config,
      message
    };

    if (!this.loadingStates.has(componentId)) {
      this.loadingStates.set(componentId, new BehaviorSubject<LoadingState>(state));
    } else {
      this.loadingStates.get(componentId)!.next(state);
    }

    this.logService.log(LevelLogEnum.INFO, 'SkeletonService', 'Loading started', {
      componentId,
      config,
      message
    });
  }

  stopLoading(componentId: string): void {
    const state: LoadingState = {
      isLoading: false
    };

    if (this.loadingStates.has(componentId)) {
      this.loadingStates.get(componentId)!.next(state);
    }

    this.logService.log(LevelLogEnum.INFO, 'SkeletonService', 'Loading stopped', {
      componentId
    });
  }

  getLoadingState(componentId: string): Observable<LoadingState> {
    if (!this.loadingStates.has(componentId)) {
      this.loadingStates.set(componentId, new BehaviorSubject<LoadingState>({
        isLoading: false
      }));
    }
    return this.loadingStates.get(componentId)!.asObservable();
  }

  startGlobalLoading(config?: SkeletonConfig, message?: string): void {
    const state: LoadingState = {
      isLoading: true,
      skeletonConfig: config,
      message
    };
    this.globalLoadingState.next(state);

    this.logService.log(LevelLogEnum.INFO, 'SkeletonService', 'Global loading started', {
      config,
      message
    });
  }

  stopGlobalLoading(): void {
    const state: LoadingState = {
      isLoading: false
    };
    this.globalLoadingState.next(state);

    this.logService.log(LevelLogEnum.INFO, 'SkeletonService', 'Global loading stopped');
  }

  getGlobalLoadingState(): Observable<LoadingState> {
    return this.globalLoadingState.asObservable();
  }

  clearLoadingState(componentId: string): void {
    this.loadingStates.delete(componentId);
  }

  clearAllLoadingStates(): void {
    this.loadingStates.clear();
    this.globalLoadingState.next({ isLoading: false });
  }

  getPresetConfig(type: 'publications' | 'profiles' | 'comments' | 'users' | 'search'): SkeletonConfig {
    const presets: Record<string, SkeletonConfig> = {
      publications: {
        type: 'publication',
        count: 5,
        showMedia: true,
        animated: true
      },
      profiles: {
        type: 'profile',
        count: 3,
        animated: true
      },
      comments: {
        type: 'comment',
        count: 4,
        animated: true
      },
      users: {
        type: 'list-item',
        count: 6,
        animated: true
      },
      search: {
        type: 'card',
        count: 4,
        animated: true
      }
    };

    return presets[type] || { type: 'publication', count: 3 };
  }
} 