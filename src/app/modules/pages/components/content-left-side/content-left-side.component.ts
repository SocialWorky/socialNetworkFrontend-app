import { Component } from '@angular/core';
import { WidgetPosition } from '@shared/modules/worky-widget/worky-news/interface/widget.interface';

@Component({
    selector: 'worky-content-left-side',
    templateUrl: './content-left-side.component.html',
    styleUrls: ['./content-left-side.component.scss'],
    standalone: false
})
export class ContentLeftSideComponent{
  WidgetPosition = WidgetPosition;

  constructor() { }
}
