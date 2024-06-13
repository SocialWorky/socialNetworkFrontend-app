import { Component } from '@angular/core';
import { DeviceDetectionService } from '@shared/services/DeviceDetection.service';

@Component({
  selector: 'worky-loyaut',
  templateUrl: './loyaut.component.html',
  styleUrls: ['./loyaut.component.scss'],
})
export class LoyautComponent  {

  get isMobile(): boolean {
    return this._deviceDetectionService.isMobile();
  }

  constructor( private _deviceDetectionService: DeviceDetectionService ) { }

}
