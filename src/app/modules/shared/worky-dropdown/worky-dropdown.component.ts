import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { DropdownDataLink } from './interfaces/dataLink.interface';

@Component({
  selector: 'worky-dropdown',
  templateUrl: './worky-dropdown.component.html',
  styleUrls: ['./worky-dropdown.component.scss'],
})
export class WorkyDropdownComponent  implements OnInit {

  @Input() icon: string = 'add_circle';

  @Input() badge?: boolean = false;

  @Input() badgeValue?: number = 0;

  @Input() dataLink?: DropdownDataLink[] = [];

  @Input() img?: string = undefined;

  @Output() linkClicked: EventEmitter<DropdownDataLink> = new EventEmitter<DropdownDataLink>();

  constructor() { }

  // eslint-disable-next-line @angular-eslint/no-empty-lifecycle-method
  ngOnInit() {}

  handleMenuItemClick(data: DropdownDataLink) {
    this.linkClicked.emit(data);
  }

}
