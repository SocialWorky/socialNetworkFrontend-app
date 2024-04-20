import { Injectable, OnDestroy, EventEmitter } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Platform } from '@ionic/angular';
import { Subject, fromEvent } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DeviceDetectionService implements OnDestroy {

  private destroy$: Subject<void> = new Subject<void>();
  private resizeEvent: EventEmitter<boolean> = new EventEmitter<boolean>();

  private _isScreenSmallerThan600px: boolean = false;

  constructor(
    private readonly _platform: Platform
  ) { 
    this.detectScreenSize();
    fromEvent(window, 'resize')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.detectScreenSize();
        this.resizeEvent.emit(this._isScreenSmallerThan600px);
      });
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

  getResizeEvent(): EventEmitter<boolean> {
    return this.resizeEvent;
  }
}
