import { Component, Input, OnInit } from '@angular/core';
import { User } from '@shared/interfaces/user.interface';

import { WorkyButtonType, WorkyButtonTheme } from '@shared/modules/buttons/models/worky-button-model';

@Component({
  selector: 'worky-profile-detail',
  templateUrl: './profile-detail.component.html',
  styleUrls: ['./profile-detail.component.scss'],
})
export class ProfileDetailComponent  implements OnInit {

  WorkyButtonType = WorkyButtonType;

  WorkyButtonTheme = WorkyButtonTheme;

  @Input() isCurrentUser: boolean | undefined;

  @Input() userData: User | undefined;

  constructor() { }

  ngOnInit() {}

  abrirFormulario() {}

}
