import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { DeviceDetectionService } from '@shared/services/DeviceDetection.service';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'worky-loyaut',
  templateUrl: './loyaut.component.html',
  styleUrls: ['./loyaut.component.scss'],
})

export class LoyautComponent implements OnInit {

  routeUrl: string = '';

  isProfile: boolean = false;

  private routeSub: Subscription | undefined;

  get isMobile(): boolean {
    return this._deviceDetectionService.isMobile();
  }

  constructor( 
    private _deviceDetectionService: DeviceDetectionService,
    private _router: Router,
    private _cdr: ChangeDetectorRef
  ) {}

ngOnInit(): void {
    this.routeSub = this._router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd)
      )
      .subscribe((event: NavigationEnd) => {
        this.routeUrl = event.url;
        this.isProfile = this.routeUrl.includes('profile');
        this._cdr.markForCheck();
      });

    this.routeUrl = this._router.url;
    this.isProfile = this.routeUrl.includes('profile');
    this._cdr.markForCheck();
  }

  ngOnDestroy(): void {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
  }

}
