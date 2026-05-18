import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SubscriptionWallService {
  private _visible$ = new BehaviorSubject<boolean>(false);
  readonly isVisible$ = this._visible$.asObservable();

  show(): void { this._visible$.next(true); }
  hide(): void { this._visible$.next(false); }
}
