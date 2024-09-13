import { AfterViewChecked, ChangeDetectorRef, Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import * as _ from 'lodash';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';

import { WorkyButtonType, WorkyButtonTheme } from '@shared/modules/buttons/models/worky-button-model';
import { MessageService } from '../../services/message.service';
import { AuthService } from '@auth/services/auth.service';
import { CreateMessage, Message } from '../../interfaces/message.interface';
import { User } from '@shared/interfaces/user.interface';
import { UserService } from '@shared/services/users.service';
import { NotificationMessageChatService } from '@shared/services/notifications/notificationMessageChat.service';
import { NotificationService } from '@shared/services/notifications/notification.service';
import { DeviceDetectionService } from '@shared/services/DeviceDetection.service';
import { GifSearchComponent } from '@shared/modules/gif-search/gif-search.component';
import { ImageUploadModalComponent } from '@shared/modules/image-upload-modal/image-upload-modal.component';
import { FileUploadService } from '@shared/services/file-upload.service';
import { environment } from '@env/environment';
import { LoadingController } from '@ionic/angular';

@Component({
  selector: 'worky-message-side-rigth',
  templateUrl: './message-side-rigth.component.html',
  styleUrls: ['./message-side-rigth.component.scss'],
})
export class MessageSideRigthComponent implements OnChanges, OnDestroy, AfterViewChecked, OnInit{

  WorkyButtonType = WorkyButtonType;

  WorkyButtonTheme = WorkyButtonTheme;

  userIdMessage: string = '';

  currentUser = this._authService.getDecodedToken()!;

  messages: Message[] = [];

  user: User[] = [];

  loadMessages = false;

  newMessage: string = '';

  showEmojiPicker: boolean = false;

  sendMessagesLoader: boolean = false;

  plainText = 'plainText';

  selectedFiles: File[] = [];

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
    private _deviceDetectionService: DeviceDetectionService,
    private _dialog: MatDialog,
    private _fileUploadService: FileUploadService,
    private _loadingCtrl: LoadingController,
  ) {}

  async ngOnInit() {
    this.userIdMessage = await this._activatedRoute.snapshot.paramMap.get('userIdMessages') || '';
    if(this.userIdMessage) this.userId = this.userIdMessage;

    if (this.userIdMessage && this.currentUser.id) {
      await this.loadMessagesWithUser(this.currentUser.id, this.userIdMessage);
    }

    if (this.isMobile) {
      if (this.userIdMessage && this.currentUser.id) {
        await this.loadMessagesWithUser(this.currentUser.id, this.userIdMessage);
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
    this.loadMessagesWithUser(this.currentUser.id, this.userId);
    this.markMessagesAsRead();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['userId'] && !changes['userId'].isFirstChange()) {
      this.loadMessagesWithUser(this.currentUser.id, changes['userId'].currentValue);
      this._cdr.markForCheck();
      // this.scrollToBottom();
    }
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  private async loadMessagesWithUser(currentUserId: string, userIdMessage: string) {
    if (userIdMessage === currentUserId) return;
    this.loadMessages = true;
    await this.getUser(userIdMessage);
    this._messageService.getConversationsWithUser(currentUserId, userIdMessage).pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: (messages: Message[]) => {
        this.messages = messages;
        this._cdr.markForCheck();
        this.loadMessages = false;
        this.scrollToBottom();
      },
      error: (error) => {
        console.error('Error loading messages:', error);
        this.loadMessages = false;
      }
    });
  }

  private async getUser(userId: string) {
    this.user = [];
    await this._user.getUserById(userId).pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: (user: User) => {
        this.user = [user];
        this._cdr.markForCheck();
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

 async sendMessage(type: string, content?: string) {
    if (this.newMessage.trim() === '' && type === this.plainText) return;

    const messageContent = type === this.plainText ? this.newMessage : content;

    this.sendMessagesLoader = true;

    const message: CreateMessage = {
      receiverId: this.userId,
      content: messageContent !== undefined ? messageContent : this.newMessage,
      type: 'text'
    };

    await this._messageService.createMessage(message).pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: (msg) => {
        this._notificationMessageChatService.sendNotificationMessageChat(msg);
        this._notificationService.sendNotification();
        this.newMessage = '';
        this.scrollToBottom();
        this.sendMessagesLoader = false;
        this._cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error sending message:', error);
        this.sendMessagesLoader = false
      }
    });
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messageContainer) {
        try {
          this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
        } catch (err) {
          console.error('Error scrolling to bottom:', err);
        }
      }
    }, 1000);
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

  autoResize(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = '40px';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 96)}px`;
  }

  openGifSearch() {
    const dialogConfig = new MatDialogConfig();

    dialogConfig.width = '540px';
    dialogConfig.height = '500px';
    dialogConfig.panelClass = 'gifSearch-modal-container';

    const dialogRef = this._dialog.open(GifSearchComponent, dialogConfig);

    dialogRef.componentInstance.gifSelected.subscribe((gifUrl: string) => {
      this.sendMessagesLoader = true;
      this.onGifSelected(gifUrl);
      dialogRef.close();
    });
  }

  onGifSelected(gifUrl: string) {
    this.sendMessage('gifContent', `![GIF](${gifUrl})`);
  }

  openUploadModal() {
    const dialogRef = this._dialog.open(ImageUploadModalComponent, {
      data: {
        maxFiles: 1,
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.selectedFiles = result;
        this.uploadFiles('messages');
      }
    });
  }

  private async uploadFiles(folder: string) {
    const loadingUploadImage = await this._loadingCtrl.create({
      message: 'Subiendo imagen...',
    });

    loadingUploadImage.present();

    return this._fileUploadService.uploadFile(this.selectedFiles, folder).pipe(takeUntil(this.unsubscribe$)).subscribe({
          next: (file) => {
            const imagenSaved = environment.APIFILESERVICE + 'messages/' + file[0].filenameCompressed;
            this.sendMessage('imageContent', `![Image](${imagenSaved})`);
            loadingUploadImage.dismiss();
          },
          error: (error) => {
            console.error('Error uploading files:', error);
          }
        });
  }

}
