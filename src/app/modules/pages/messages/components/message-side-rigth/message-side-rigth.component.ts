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
import { UserService } from '@shared/services/core-apis/users.service';
import { NotificationMessageChatService } from '@shared/services/notifications/notificationMessageChat.service';
import { NotificationService } from '@shared/services/notifications/notification.service';
import { DeviceDetectionService } from '@shared/services/device-detection.service';
import { GifSearchComponent } from '@shared/modules/gif-search/gif-search.component';
import { ImageUploadModalComponent } from '@shared/modules/image-upload-modal/image-upload-modal.component';
import { FileUploadService } from '@shared/services/core-apis/file-upload.service';
import { LoadingController } from '@ionic/angular';
import { Token } from '@shared/interfaces/token.interface';
import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';
import { SocketService } from '@shared/services/socket.service';
import { ExternalMessage } from '@shared/interfaces/notification-external-message.interface';
import { MediaType } from '@shared/modules/image-organizer/interfaces/image-organizer.interface';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';

@Component({
    selector: 'worky-message-side-rigth',
    templateUrl: './message-side-rigth.component.html',
    styleUrls: ['./message-side-rigth.component.scss'],
    standalone: false
})
export class MessageSideRigthComponent implements OnChanges, OnDestroy, AfterViewChecked, OnInit{

  WorkyButtonType = WorkyButtonType;

  WorkyButtonTheme = WorkyButtonTheme;

  MediaType = MediaType;

  userIdMessage: string = '';

  currentUser: Token | null = this._authService.getDecodedToken();

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

  trackByMessageId(index: number, message: Message): string {
    return message._id;
  }

  @ViewChild(CdkVirtualScrollViewport, { static: false }) private messageContainer?: CdkVirtualScrollViewport;

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
    private _socketService: SocketService,
  ) { }

  async ngOnInit() {
    this.currentUser = this._authService.getDecodedToken();
    this.userIdMessage = await this._activatedRoute.snapshot.paramMap.get('userIdMessages') || '';
    if(this.userIdMessage) this.userId = this.userIdMessage;

    if (this.userIdMessage && this.currentUser!.id) {
      await this.loadMessagesWithUser(this.currentUser!.id, this.userIdMessage);
    }

    if (this.isMobile) {
      if (this.userIdMessage && this.currentUser!.id) {
        await this.loadMessagesWithUser(this.currentUser!.id, this.userIdMessage);
      }
      this._cdr.markForCheck();
    }

    await this._notificationMessageChatService.notificationMessageChat$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (message: any) => {
          if (message.senderId === this.userId || message.receiverId === this.userId) {
            this.messages = [...this.messages, message];
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

    await this.loadMessagesWithUser(this.currentUser!.id, this.userId);
    this.markMessagesAsRead();

    this._socketService.listenEvent('newExternalMessage', (message: ExternalMessage) => {
      if (message.type === TypePublishing.MESSAGE) {
        this.updateContentMessage(message.idReference, message.response?.content, message.response?.typeFile, message.response?.urlFile);
      }
    });
  }

  private updateContentMessage(idMessage: string, contentMessage: string, typeFile: string, urlFile: string) {
    if (!idMessage) return;
    this.messages.forEach(message => {
      if (message._id === idMessage) {
        message.content = contentMessage;
        message.type = typeFile;
        message.urlFile = urlFile;
        this._cdr.detectChanges();
        this._notificationService.sendNotification(this.messages);
      }
    })

  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['userId'] && !changes['userId'].isFirstChange()) {
      this.loadMessagesWithUser(this.currentUser!.id, changes['userId'].currentValue);
      this._cdr.markForCheck();
      this.scrollToBottom();
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (!this.isMobile) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        this.sendMessage(this.plainText);
      }
    }
  }

  ngAfterViewChecked(): void {
    setTimeout(() => {
      this.scrollToBottom();
    }, 0);
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  async loadMessagesWithUser(currentUserId: string, userIdMessage: string) {
    if (userIdMessage === currentUserId) {
      return;
    }
    this.loadMessages = true;
    try {
      await this.getUser(userIdMessage);

      await this._messageService.getConversationsWithUser(currentUserId, userIdMessage)
        .pipe(
          takeUntil(this.unsubscribe$)
        )
        .subscribe({
          next: (messages: Message[]) => {
            this.messages = messages;
            this._cdr.markForCheck();
          },
          error: (error) => {
            console.error('Error loading messages:', error);
            this.loadMessages = false;
          },
          complete: () => {
            this.loadMessages = false;
          }
        });
    } catch (error) {
      console.error('Error en loadMessagesWithUser:', error);
      this.loadMessages = false;
    }
  }


  private async getUser(userId: string): Promise<void> {
    this.user = [];
    try {
      const user = await this._user.getUserById(userId).pipe(takeUntil(this.unsubscribe$)).toPromise();
      if (user) {
        this.user = [user];
      }
      this._cdr.markForCheck();
    } catch (error) {
      console.error('Error loading user:', error);
      throw error;
    }
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

        if(type === 'procesando') {
          this._fileUploadService.uploadFile(this.selectedFiles, 'messages', msg._id, '', TypePublishing.MESSAGE).pipe(takeUntil(this.unsubscribe$)).subscribe();
        }

        const textarea = document.querySelector('textarea');
        if (textarea) {
          textarea.style.height = '40px';
        }

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
          this.messageContainer.scrollTo({
            behavior: 'smooth',
            top: this.messages.length * 1000,
          })
        } catch (err) {
          console.error('Error scrolling to bottom:', err);
        }
      }
    }, 0);
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
        this.scrollToBottom();
        this.uploadFiles();
      }
    });
  }

  private async uploadFiles() {
    const loadingUploadImage = await this._loadingCtrl.create({
      message: 'Subiendo....',
    });

    loadingUploadImage.present();

    this.sendMessage('procesando', 'procesando');
    loadingUploadImage.dismiss();

  }

  isVideoUrl(url: string): boolean {
    return /\.(mp4|ogg|webm|avi|mov)$/i.test(url);
  }

  getThumbnail(message: any): string {
    const patron = /\(([^)]+)\)/;
    const match = message.match(patron);
    if (match && match[1]) {
      return match[1];
    }
    return '';
  }

  openUrl(url: string): void {
    if (url) window.open(url, '_blank');
  }

}
