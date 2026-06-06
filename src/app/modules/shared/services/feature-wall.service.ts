import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface FeatureWallState {
  visible: boolean;
  blockedFeature: string;
  planFeatures: string[];
}

const INITIAL_STATE: FeatureWallState = {
  visible: false,
  blockedFeature: '',
  planFeatures: [],
};

@Injectable({ providedIn: 'root' })
export class FeatureWallService {
  private state$ = new BehaviorSubject<FeatureWallState>(INITIAL_STATE);
  readonly featureWall$ = this.state$.asObservable();

  show(blockedFeature: string, planFeatures: string[] = []): void {
    this.state$.next({ visible: true, blockedFeature, planFeatures });
  }

  hide(): void {
    this.state$.next(INITIAL_STATE);
  }
}
