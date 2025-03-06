import { Injectable, OnDestroy, EventEmitter } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Platform } from '@ionic/angular';
import { Subject, fromEvent } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as _ from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class DeviceDetectionService implements OnDestroy {

  private destroy$: Subject<void> = new Subject<void>();

  private resizeEvent: EventEmitter<boolean> = new EventEmitter<boolean>();

  private _isScreenSmallerThan700px: boolean = false;

  constructor(
    private readonly _platform: Platform
  ) { 
    this.detectScreenSize();
    fromEvent(window, 'resize')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.detectScreenSize();
        this.resizeEvent.emit(this._isScreenSmallerThan700px);
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private detectScreenSize() {
    this._isScreenSmallerThan700px = window.innerWidth < 700;
  }

  isMobile(): boolean {
    if(this._platform.is('tablet') || this._platform.is('ipad') || !this.isScreenSmallerThan700px()) return false;
    return (
      this.isNative()
      || this.isScreenSmallerThan700px()
      || this._platform.is('ios')
      || this._platform.is('iphone')
      || this._platform.is('android')
    );
  }

  isTablet(): boolean {
    return this._platform.is('tablet') || this._platform.is('ipad');
  }

  private isScreenSmallerThan700px(): boolean {
    return this._isScreenSmallerThan700px;
  }

  isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  width() {
    return this._platform.width();
  }

  height() {
    return this._platform.height();
  }

  getResizeEvent(): EventEmitter<boolean> {
    return this.resizeEvent;
  }
}
