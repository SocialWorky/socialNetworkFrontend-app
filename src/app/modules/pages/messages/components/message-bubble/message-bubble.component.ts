import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

import { Message, MessageStatus } from '../../interfaces/message.interface';

@Component({
  selector: 'worky-message-bubble',
  templateUrl: './message-bubble.component.html',
  styleUrls: ['./message-bubble.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessageBubbleComponent {
  @Input() message!: Message;
  @Input() isOwn = false;

  MessageStatus = MessageStatus;

  getStatusIcon(): string {
    if (!this.isOwn) return '';
    
    switch (this.message.status) {
      case MessageStatus.READ:
        return 'done_all';
      case MessageStatus.DELIVERED:
        return 'done_all';
      case MessageStatus.SENT:
        return 'done';
      default:
        return 'schedule';
    }
  }
}

