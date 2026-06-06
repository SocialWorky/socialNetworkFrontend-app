import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ViewChild, ElementRef } from '@angular/core';
import { Message, MessageType } from '../../interfaces/message.interface';
import { Token } from '@shared/interfaces/token.interface';
import { LazyCssService } from '@shared/services/core-apis/lazy-css.service';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { translations } from '@translations/translations';

@Component({
  selector: 'worky-chat-input',
  templateUrl: './chat-input.component.html',
  styleUrls: ['./chat-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ChatInputComponent {
  @Input() isSending = false;
  @Input() replyingToMessage: Message | null = null;
  @Input() otherUserId: string | null = null;
  @Input() decodedToken!: Token;
  @Input() otherUserName: string = '';
  @Input() messageContent = '';

  @Output() sendMessage = new EventEmitter<{type: string, content?: string, urlFile?: string}>();
  @Output() typing = new EventEmitter<string>();
  @Output() cancelReplyEvent = new EventEmitter<void>();
  @Output() openGifSearchEvent = new EventEmitter<void>();
  @Output() openUploadModalEvent = new EventEmitter<void>();
  @Output() messageContentChange = new EventEmitter<string>();

  @ViewChild('messageInput', { static: false }) messageInput!: ElementRef;
  @ViewChild('emojiWrapper', { static: false }) emojiWrapper!: ElementRef;

  showEmojiPicker = false;
  emojiPickerReady = false;
  MessageType = MessageType;
  plainText = 'plainText';

  constructor(
    private _lazyCssService: LazyCssService,
    private _logService: LogService
  ) {}

  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSendMessage();
    }
  }

  onSendMessage() {
    if (this.messageContent.trim() || this.replyingToMessage) {
      this.sendMessage.emit({ type: this.plainText, content: this.messageContent });
    }
  }

  autoResize(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = '40px';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 96)}px`;
    
    this.handleTyping();
  }

  handleTyping() {
    this.typing.emit(this.messageContent);
    this.messageContentChange.emit(this.messageContent);
  }

  cancelReply() {
    this.cancelReplyEvent.emit();
  }

  openGifSearch() {
    this.openGifSearchEvent.emit();
  }

  openUploadModal() {
    this.openUploadModalEvent.emit();
  }

  toggleEmojiPicker(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    
    if (this.showEmojiPicker) {
      this.showEmojiPicker = false;
      this.emojiPickerReady = false;
    } else {
      this.showEmojiPicker = true;
      this.emojiPickerReady = false;
      this.loadEmojiMartCss().then(() => {
        setTimeout(() => {
          this.positionEmojiPicker();
          this.emojiPickerReady = true;
        }, 50);
      });
    }
  }

  private positionEmojiPicker() {
    if (this.emojiWrapper && this.emojiWrapper.nativeElement) {
      const buttonRect = this.emojiWrapper.nativeElement.getBoundingClientRect();
      const picker = document.querySelector('.emoji-picker-container') as HTMLElement;
      if (picker) {
        const pickerWidth = 352;
        picker.style.position = 'fixed';
        picker.style.bottom = `${window.innerHeight - buttonRect.top + 10}px`;
        picker.style.right = '';
        const leftPos = buttonRect.left;
        const maxLeft = window.innerWidth - pickerWidth - 8;
        picker.style.left = `${Math.min(leftPos, maxLeft)}px`;
      }
    }
  }

  private async loadEmojiMartCss(): Promise<void> {
    try {
      if (!this._lazyCssService.isLoaded('emoji-mart')) {
        await this._lazyCssService.loadEmojiMartCss();
      }
    } catch (error) {
      this._logService.log(
        LevelLogEnum.ERROR,
        'ChatInputComponent',
        'Error loading emoji-mart CSS',
        { error: String(error) }
      );
    }
  }

  addEmoji(event: any) {
    if (event && event.emoji && event.emoji.native) {
      this.messageContent += event.emoji.native;
      this.showEmojiPicker = false;
      this.messageContentChange.emit(this.messageContent);
      
      setTimeout(() => {
        const picker = document.querySelector('.emoji-picker-container') as HTMLElement;
        if (picker) {
          picker.style.display = 'none';
        }
      }, 100);
    }
  }

  isOwnMessage(message: Message): boolean {
    return message.senderId === this.decodedToken.id; // Assuming decodedToken has id
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
}
