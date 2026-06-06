import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { Message, MessageType } from '../../interfaces/message.interface';
import { MediaType } from '@shared/modules/image-organizer/interfaces/image-organizer.interface';
import { Token } from '@shared/interfaces/token.interface';
import { DropdownDataLink } from '@shared/modules/worky-dropdown/interfaces/dataLink.interface';
import { translations } from '@translations/translations';
import { UtilityService } from '@shared/services/utility.service';
import { environment } from '@env/environment';

@Component({
  selector: 'worky-chat-message',
  templateUrl: './chat-message.component.html',
  styleUrls: ['./chat-message.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ChatMessageComponent {
  @Input() message!: Message;
  @Input() currentUserId: string | null = null;
  @Input() previousMessage: Message | null = null;
  @Input() nextMessage: Message | null = null;
  @Input() otherUserName: string = '';
  @Input() otherUserAvatar: string | null = null;
  @Input() decodedToken!: Token;
  @Input() editingMessageId: string | null = null;
  @Input() editingMessageContent: string = '';

  @Output() reply = new EventEmitter<Message>();
  @Output() edit = new EventEmitter<Message>();
  @Output() delete = new EventEmitter<Message>();
  @Output() saveEdit = new EventEmitter<{id: string, content: string}>();
  @Output() cancelEditEvent = new EventEmitter<void>();
  @Output() openUrlEvent = new EventEmitter<string>();
  @Output() messageAction = new EventEmitter<{action: string, message: Message}>();
  @Output() editingContentChange = new EventEmitter<string>();

  MediaType = MediaType;
  MessageType = MessageType;

  constructor(private utilityService: UtilityService) {}

  messageOptions: DropdownDataLink<any>[] = [
    {
      title: translations['messages.edit'] || 'Editar',
      linkUrl: 'edit',
      icon: 'edit'
    },
    {
      title: translations['messages.delete'] || 'Eliminar',
      linkUrl: 'delete',
      icon: 'delete',
      color: 'red'
    }
  ];

  isOwnMessage(message: Message): boolean {
    return message.senderId === this.currentUserId;
  }

  formatDate(date: string | Date): string {
    return new Intl.DateTimeFormat('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  }

  formatTime(date: string | Date): string {
    return new Intl.DateTimeFormat('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date(date));
  }

  isGroupedMessage(): boolean {
    if (!this.previousMessage) return false;
    return this.previousMessage.senderId === this.message.senderId && 
           this.formatDate(this.message.timestamp) === this.formatDate(this.previousMessage.timestamp);
  }

  isFirstInGroup(): boolean {
    if (!this.previousMessage) return true;
    return this.previousMessage.senderId !== this.message.senderId || 
           this.formatDate(this.message.timestamp) !== this.formatDate(this.previousMessage.timestamp);
  }

  isLastInGroup(): boolean {
    if (!this.nextMessage) return true;
    return this.nextMessage.senderId !== this.message.senderId || 
           this.formatDate(this.message.timestamp) !== this.formatDate(this.nextMessage.timestamp);
  }

  shouldShowDateDivider(): boolean {
    if (!this.previousMessage) return true;
    return this.formatDate(this.message.timestamp) !== this.formatDate(this.previousMessage.timestamp);
  }

  getThumbnail(message: string): string {
    if (!message) return '';
    const patron = /\(([^)]+)\)/;
    const match = message.match(patron);
    if (match && match[1]) {
      return this.utilityService.normalizeImageUrl(match[1], environment.MINIO_BUCKET_URL || '');
    }
    return '';
  }

  getNormalizedUrl(url: string | undefined): string {
    if (!url) return '';
    return this.utilityService.normalizeImageUrl(url, environment.MINIO_BUCKET_URL || '');
  }

  getImageSrc(message: Message): string {
    // Try to get thumbnail from content first (markdown format)
    const thumbnail = this.getThumbnail(message.content);
    if (thumbnail) {
      return thumbnail;
    }
    
    // Fallback to normalized urlFile
    if (message.urlFile) {
      return this.getNormalizedUrl(message.urlFile);
    }
    
    // Return empty string if no image source available
    return '';
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && img.src) {
      // If image fails to load, try to set a fallback
      img.src = 'assets/img/shared/handleImageError.png';
    }
  }

  getReplyMessagePreview(replyMessage: Message): string {
    if (!replyMessage) return '';
    
    if (replyMessage.isDeleted) {
      return translations['messages.deleted'] || 'Mensaje eliminado';
    }

    if (replyMessage.type === MessageType.IMAGE) {
      return `📷 ${translations['messages.image'] || 'Imagen'}`;
    }

    if (replyMessage.type === MessageType.VIDEO) {
      return `🎥 ${translations['messages.video'] || 'Video'}`;
    }

    if (replyMessage.type === MessageType.FILE) {
      return `📁 ${translations['message.typeFile'] || 'Archivo'}`;
    }

    return replyMessage.content || '';
  }

  startReplyToMessage(message: Message) {
    this.reply.emit(message);
  }

  handleMessageAction(event: any, message: Message) {
    this.messageAction.emit({ action: event.linkUrl, message });
  }

  saveEditedMessage(id: string, event?: Event) {
    if (event) {
      event.preventDefault();
    }
    this.saveEdit.emit({ id, content: this.editingMessageContent });
  }

  cancelEdit() {
    this.cancelEditEvent.emit();
  }

  openUrl(url: string) {
    this.openUrlEvent.emit(url);
  }

  onContentChange(value: string) {
    this.editingContentChange.emit(value);
  }
}
