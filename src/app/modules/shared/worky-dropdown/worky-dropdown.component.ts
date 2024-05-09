import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { DropdownDataLink } from './interfaces/dataLink.interface';
import { jwtDecode } from 'jwt-decode';
import { Token } from '../interfaces/token.interface';

@Component({
  selector: 'worky-dropdown',
  templateUrl: './worky-dropdown.component.html',
  styleUrls: ['./worky-dropdown.component.scss'],
})
export class WorkyDropdownComponent  implements OnInit {

  userName: string = '';

  token = localStorage.getItem('token');

  @Input() icon: string = 'add_circle';

  @Input() badge?: boolean = false;

  @Input() badgeValue?: number | null | undefined = 0;

  @Input() dataLink?: DropdownDataLink[] = [];

  @Input() img?: string = undefined;

  @Output() linkClicked: EventEmitter<DropdownDataLink> = new EventEmitter<DropdownDataLink>();

  constructor() { }

  ngOnInit() {
    if (this.token) {
      const decodedToken: Token = jwtDecode(this.token);
      this.userName = decodedToken.name;
    }
  }

  handleMenuItemClick(data: DropdownDataLink) {
    this.linkClicked.emit(data);
  }

}
