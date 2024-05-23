import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AuthService } from '@auth/services/auth.service';
import { DropdownDataLink } from './interfaces/dataLink.interface';

@Component({
  selector: 'worky-dropdown',
  templateUrl: './worky-dropdown.component.html',
  styleUrls: ['./worky-dropdown.component.scss'],
})
export class WorkyDropdownComponent  implements OnInit {

  @Input() icon: string | undefined;

  @Input() badge?: boolean = false;

  @Input() badgeValue?: number | null | undefined = 0;

  @Input() dataLink?: DropdownDataLink<any>[] = [];

  @Input() img?: string | boolean = undefined;

  @Output() linkClicked: EventEmitter<DropdownDataLink<any>> = new EventEmitter<DropdownDataLink<any>>();

  constructor(private _authService: AuthService) { }

  // eslint-disable-next-line @angular-eslint/no-empty-lifecycle-method
  ngOnInit() {}

  handleMenuItemClick(data: DropdownDataLink<any>) {
    this.linkClicked.emit(data);
  }

}
