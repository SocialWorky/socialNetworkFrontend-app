import { Component } from '@angular/core';
import { WorkyButtonType, WorkyButtonTheme } from '../../../shared/buttons/models/worky-button-model';

@Component({
  selector: 'worky-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent { 

  WorkyButtonType = WorkyButtonType;

  WorkyButtonTheme = WorkyButtonTheme;

  constructor() {}

  register() {
    console.log('Register');
  }

}

