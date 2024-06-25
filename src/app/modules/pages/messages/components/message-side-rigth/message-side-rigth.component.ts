import { Component, OnInit } from '@angular/core';

import { WorkyButtonType, WorkyButtonTheme } from '@shared/modules/buttons/models/worky-button-model';
import { MessageService } from '../../services/message.service';

@Component({
  selector: 'worky-message-side-rigth',
  templateUrl: './message-side-rigth.component.html',
  styleUrls: ['./message-side-rigth.component.scss'],
})
export class MessageSideRigthComponent  implements OnInit {

  WorkyButtonType = WorkyButtonType;
  
  WorkyButtonTheme = WorkyButtonTheme;

  constructor(private _messageService: MessageService) { }

  ngOnInit() {}

}
