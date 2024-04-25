import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { DropdownDataLink } from './interfaces/dataLink.interface';
import { WorkyAvatarComponent } from '../worky-avatar/worky-avatar.component';
@Component({
  selector: 'worky-dropdown',
  templateUrl: './worky-dropdown.component.html',
  styleUrls: ['./worky-dropdown.component.scss'],
})
export class WorkyDropdownComponent  implements OnInit {

  avatarComponent: WorkyAvatarComponent = new WorkyAvatarComponent();

  @Input() icon: string = 'add_circle';

  @Input() badge?: boolean = false;

  @Input() badgeValue?: number | null | undefined = 0;

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
