import { Component } from '@angular/core';
import { WidgetPosition } from '@shared/modules/worky-widget/worky-news/interface/widget.interface';
import { ConfigService } from '@shared/services/core-apis/config.service';

@Component({
    selector: 'worky-content-left-side',
    templateUrl: './content-left-side.component.html',
    styleUrls: ['./content-left-side.component.scss'],
    standalone: false
})
export class ContentLeftSideComponent{
  WidgetPosition = WidgetPosition;

  locationDiscoveryEnabled$ = this._configService.locationDiscoveryEnabled$;

  constructor(private readonly _configService: ConfigService) { }
}
