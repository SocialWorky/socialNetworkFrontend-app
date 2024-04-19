import { Injectable, OnDestroy } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Platform } from '@ionic/angular';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DeviceDetectionService implements OnDestroy {

  private destroy$: Subject<void> = new Subject<void>();

  private _isScreenSmallerThan600px: boolean = false;

  constructor(
    private readonly _platform: Platform
  ) { 
    this.detectScreenSize();
    window.addEventListener('resize', () => this.detectScreenSize());
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private detectScreenSize() {
    this._isScreenSmallerThan600px = window.innerWidth < 600;
  }

  isMobile(): boolean {
    return (
      this.isNative()
      || this.isScreenSmallerThan600px()
      || this._platform.is('ios')
      || this._platform.is('iphone')
      || this._platform.is('android')
    );
  }

  private isScreenSmallerThan600px(): boolean {
    return this._isScreenSmallerThan600px;
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
}
