import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

import { WorkyButtonType, WorkyButtonTheme } from '@shared/modules/buttons/models/worky-button-model';
import { MessageService } from '../../services/message.service';
import { AuthService } from '@auth/services/auth.service';
import { CreateMessage, Message } from '../../interfaces/message.interface';
import { User } from '@shared/interfaces/user.interface';
import { UserService } from '@shared/services/users.service';
import { NotificationMessageChatService } from '@shared/services/notifications/notificationMessageChat.service';
import { NotificationService } from '@shared/services/notifications/notification.service';
import { DeviceDetectionService } from '@shared/services/DeviceDetection.service';
import { ActivatedRoute } from '@angular/router';
import * as _ from 'lodash';

@Component({
  selector: 'worky-message-side-rigth',
  templateUrl: './message-side-rigth.component.html',
  styleUrls: ['./message-side-rigth.component.scss'],
})
export class MessageSideRigthComponent implements OnChanges, OnDestroy, AfterViewInit, OnInit{

  WorkyButtonType = WorkyButtonType;
  WorkyButtonTheme = WorkyButtonTheme;

  userIdMessage: string = '';
  currentUser = this._authService.getDecodedToken()!;
  messages: Message[] = [];
  user: User[] = [];
  loadMessages = false;
  newMessage: string = '';
  showEmojiPicker: boolean = false;

  get isMobile(): boolean {
    return this._deviceDetectionService.isMobile();
  }

  @ViewChild('messageContainer', { static: false }) private messageContainer?: ElementRef;

  private unsubscribe$ = new Subject<void>();

  @Input()
  userId: string = '';

  constructor(
    private _messageService: MessageService,
    private _authService: AuthService,
    private _cdr: ChangeDetectorRef,
    private _user: UserService,
    private _activatedRoute: ActivatedRoute,
    private _notificationMessageChatService: NotificationMessageChatService,
    private _notificationService: NotificationService,
    private _deviceDetectionService: DeviceDetectionService
  ) {}

  async ngOnInit() {
    this.userIdMessage = await this._activatedRoute.snapshot.paramMap.get('userIdMessages') || '';
    this.userId = this.userIdMessage;
    if (this.isMobile) {
      if (this.userIdMessage && this.currentUser.id) {
        this.loadMessagesWithUser(this.currentUser.id, this.userIdMessage);
      }
      this._cdr.markForCheck();
    }

    await this._notificationMessageChatService.notificationMessageChat$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (message: any) => {
          if (message.senderId === this.userId || message.receiverId === this.userId) {
            this.messages.push(message);
            this._cdr.markForCheck();
            this.scrollToBottom();
          }
        }
      });

    await this._notificationService.notification$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (notification: any) => {
          if (notification) {
            this.updateMessages(notification);
          }
        }
      });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['userId'] && !changes['userId'].isFirstChange()) {
      this.loadMessagesWithUser(this.currentUser.id, changes['userId'].currentValue);
      this._cdr.markForCheck();
    }
  }

  ngAfterViewInit() {
    this.scrollToBottom();
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  private async loadMessagesWithUser(currentUserId: string, userIdMessage: string) {
    await this.getUser(userIdMessage);
    this.loadMessages = true;
    this._messageService.getConversationsWithUser(currentUserId, userIdMessage).pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: (messages: Message[]) => {
        this.messages = messages;
        this.scrollToBottom();
        this.loadMessages = false;
        this._cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error loading messages:', error);
        this.loadMessages = false;
      }
    });
  }

  private async getUser(userId: string) {
    this.user = [];
    this._user.getUserById(userId).pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: (user: User) => {
        this.user = [user];
        this._cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading user:', error);
      }
    });
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  }

  formatTime(date: Date): string {
    return new Intl.DateTimeFormat('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date(date));
  }

  toggleEmojiPicker() {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(event: any) {
    this.newMessage += event.emoji.native;
    this.showEmojiPicker = false;
  }

 async sendMessage() {
    if (this.newMessage.trim() === '') return;

    const message: CreateMessage = {
      receiverId: this.userId,
      content: this.newMessage,
      type: 'text'
    };

    await this._messageService.createMessage(message).pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: (msg) => {
        this._notificationMessageChatService.sendNotificationMessageChat(msg);
        this.newMessage = '';
        this.scrollToBottom();
        this._cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error sending message:', error);
      }
    });
  }

  private scrollToBottom(): void {
    if (!this.userId || !this.messageContainer) return;

    setTimeout(() => {
      try {
        this.messageContainer!.nativeElement.scrollTop = this.messageContainer!.nativeElement.scrollHeight;
      } catch(err) {
        console.error('Error scrolling to bottom:', err);
      }
    }, 500);
  }

  async markMessagesAsRead() {
    if(this.isMobile) this.userId = this.userIdMessage;

    if (this.userId && this.messages.length > 0) {
      const chatId = this.messages[0].chatId;
      await this._messageService.markMessagesAsRead(chatId, this.userId).subscribe({
        next: (updatedMessages: Message[]) => {
          this._notificationService.sendNotification(updatedMessages);
          this.updateMessages(updatedMessages);
          this._cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error marking messages as read:', error);
        }
      });
    }
  }

  private updateMessages(newMessages: Message[]): void {
    let hasChanges = false;

    newMessages.forEach(newMessage => {
      const existingMessage = this.messages.find(message => message._id === newMessage._id);

      if (!existingMessage) {
        this.messages.push(newMessage);
        hasChanges = true;
      } else if (existingMessage.isRead !== newMessage.isRead) {
        existingMessage.isRead = newMessage.isRead;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      this.scrollToBottom();
      this._cdr.markForCheck();
    }
  }

  goBack() {
    window.history.back();
  }
}
