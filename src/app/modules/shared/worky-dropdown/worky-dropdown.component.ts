import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AuthService } from '../../auth/services/auth.service';
import { DropdownDataLink } from './interfaces/dataLink.interface';

@Component({
  selector: 'worky-dropdown',
  templateUrl: './worky-dropdown.component.html',
  styleUrls: ['./worky-dropdown.component.scss'],
})
export class WorkyDropdownComponent  implements OnInit {

  @Input() icon: string = 'add_circle';

  @Input() badge?: boolean = false;

  @Input() badgeValue?: number | null | undefined = 0;

  @Input() dataLink?: DropdownDataLink[] = [];

  @Input() img?: string | boolean = undefined;

  @Output() linkClicked: EventEmitter<DropdownDataLink> = new EventEmitter<DropdownDataLink>();

  constructor(private _authService: AuthService) { }

  // eslint-disable-next-line @angular-eslint/no-empty-lifecycle-method
  ngOnInit() {}

  handleMenuItemClick(data: DropdownDataLink) {
    this.linkClicked.emit(data);
  }

}
