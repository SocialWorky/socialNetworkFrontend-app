import { Component, OnInit } from '@angular/core';
import { WidgetPosition } from '@shared/modules/worky-widget/worky-news/interface/widget.interface';

@Component({
    selector: 'worky-content-right-side',
    templateUrl: './content-right-side.component.html',
    styleUrls: ['./content-right-side.component.scss'],
    standalone: false
})
export class ContentRightSideComponent implements OnInit {
  WidgetPosition = WidgetPosition;

  constructor() {}

  ngOnInit(): void {}
}
