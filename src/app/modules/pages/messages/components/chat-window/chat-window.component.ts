import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, AfterViewInit, AfterViewChecked, ChangeDetectionStrategy, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';

import { MessageService } from '../../services/message.service';
import { Message, CreateMessageDto, MessageType, MessageStatus } from '../../interfaces/message.interface';
import { AuthService } from '@auth/services/auth.service';
import { Token } from '@shared/interfaces/token.interface';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { UserService } from '@shared/services/core-apis/users.service';
import { User } from '@shared/interfaces/user.interface';
import { NotificationMessageChatService } from '@shared/services/notifications/notificationMessageChat.service';
import { NotificationService } from '@shared/services/notifications/notification.service';
import { NotificationUsersService } from '@shared/services/notifications/notificationUsers.service';
import { SocketService } from '@shared/services/socket.service';
import { FileUploadService } from '@shared/services/core-apis/file-upload.service';
import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';
import { MediaType } from '@shared/modules/image-organizer/interfaces/image-organizer.interface';
import { GifSearchComponent } from '@shared/modules/gif-search/gif-search.component';
import { ImageUploadModalComponent } from '@shared/modules/image-upload-modal/image-upload-modal.component';
import { ExternalMessage } from '@shared/interfaces/notification-external-message.interface';
import { DeviceDetectionService } from '@shared/services/device-detection.service';
import { LazyCssService } from '@shared/services/core-apis/lazy-css.service';
import { AlertService } from '@shared/services/alert.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';

import { DropdownDataLink } from '@shared/modules/worky-dropdown/interfaces/dataLink.interface';
import { translations } from '@translations/translations';
import { UtilityService } from '@shared/services/utility.service';
import { environment } from '@env/environment';

@Component({
  selector: 'worky-chat-window',
  templateUrl: './chat-window.component.html',
  styleUrls: ['./chat-window.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatWindowComponent implements OnInit, OnDestroy, AfterViewInit, AfterViewChecked, OnChanges {
  private unsubscribe$ = new Subject<void>();
  private readonly _socketHandlers: { event: string; handler: (data: any) => void }[] = [];

  @Input() otherUserId: string | null = null;
  @Input() chatId: string | null = null;
  @Input() messages: Message[] = [];
  @Input() isLoading = false;
  @Input() totalPages: number = 1;
  @Output() messageSent = new EventEmitter<Message>();
  @Output() backClicked = new EventEmitter<void>();




  currentUserId: string | null = null;
  messageContent = '';
  isSending = false;

  decodedToken!: Token;
  otherUserInfo: User | null = null;
  isLoadingUser = false;

  otherUserStatus: 'online' | 'inactive' | 'offLine' | null = null;



  selectedFiles: File[] = [];

  MediaType = MediaType;

  MessageType = MessageType;

  TypePublishing = TypePublishing;

  plainText = 'plainText';

  loadingMoreMessages = false;

  hasMoreMessages = true;

  currentPage = 1;



  isTyping = false;

  otherUserTyping = false;

  private typingTimeout: any = null;

  private _connectionSubscription: any = null;

  editingMessageId: string | null = null;

  editingMessageContent = '';

  replyingToMessage: Message | null = null;

  get isMobile(): boolean {
    return this._deviceDetectionService.isMobile();
  }

  public messageOptions: DropdownDataLink<Message>[] = [];

  constructor(
    private _messageService: MessageService,
    private _authService: AuthService,
    private _userService: UserService,
    private _cdr: ChangeDetectorRef,
    private _logService: LogService,
    private _notificationMessageChatService: NotificationMessageChatService,
    private _notificationService: NotificationService,
    private _notificationUsersService: NotificationUsersService,
    private _socketService: SocketService,
    private _fileUploadService: FileUploadService,
    private _dialog: MatDialog,
    private _deviceDetectionService: DeviceDetectionService,
    private _lazyCssService: LazyCssService,
    private _alertService: AlertService,
    private _utilityService: UtilityService
  ) {
    this.setupMessageOptions();
  }

  private _onSocket(event: string, handler: (data: any) => void): void {
    this._socketService.listenEvent(event, handler);
    this._socketHandlers.push({ event, handler });
  }

  ngOnInit() {
    this.decodedToken = this._authService.getDecodedToken()!;
    this.currentUserId = this.decodedToken.id;

    this.preloadEmojiMartCss();

    this._onSocket('chatUsers', (_data: any) => {});

    if (this.otherUserId && this.currentUserId) {
      this.joinChatRoom();
    }

    this._notificationUsersService.userStatuses$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((userStatuses: Token[]) => {
        if (this.otherUserId) {
          const otherUser = userStatuses.find(user => user.id === this.otherUserId);
          if (otherUser && otherUser.status) {
            const status = otherUser.status as 'online' | 'inactive' | 'offLine';
            if (status === 'online' || status === 'inactive' || status === 'offLine') {
              this.otherUserStatus = status;
            } else {
              this.otherUserStatus = null;
            }
            this._cdr.markForCheck();
          } else {
            this.otherUserStatus = null;
            this._cdr.markForCheck();
          }
        }
      });

    this._notificationMessageChatService.notificationMessageChat$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (data: any) => {
          if (!data) {
            return;
          }

          if (data.isReadEvent) {
            const expectedChatId = this.chatId || this._messageService.generateChatId(this.currentUserId!, this.otherUserId!);
            const socketChatId = data.chatId;

            if (socketChatId && socketChatId === expectedChatId && data.messageId) {
              this.updateMessageReadStatus(data.messageId);
            }
            return;
          }

          if (data.isEditedEvent) {
            if (!data.messageId || !data.newContent || !this.otherUserId || !this.currentUserId) {
              return;
            }

            const messageIndex = this.messages.findIndex(m => m._id === data.messageId);
            if (messageIndex === -1) {
              return;
            }

            const message = this.messages[messageIndex];
            const isRelevantMessage = (message.senderId === this.currentUserId && message.receiverId === this.otherUserId) ||
                                      (message.senderId === this.otherUserId && message.receiverId === this.currentUserId);

            if (!isRelevantMessage) {
              return;
            }

            const expectedChatId = this.chatId || this._messageService.generateChatId(this.currentUserId, this.otherUserId);
            const socketChatId = data.chatId;

            let shouldUpdate = true;

            if (socketChatId) {
              shouldUpdate = socketChatId === expectedChatId;
            }

            if (shouldUpdate) {
              const updatedMessages = [...this.messages];
              updatedMessages[messageIndex] = {
                ...updatedMessages[messageIndex],
                content: data.newContent,
                isEdited: true,
                updatedAt: data.editedAt || new Date().toISOString()
              };
              this.messages = [...updatedMessages];
              this._cdr.markForCheck();
              this._cdr.detectChanges();
              setTimeout(() => {
                this._cdr.markForCheck();
                this._cdr.detectChanges();
              }, 0);
            }
            return;
          }

          if (data.isDeletedEvent) {
            if (!data.messageId) {
              return;
            }

            const expectedChatId = this.chatId || this._messageService.generateChatId(this.currentUserId!, this.otherUserId!);
            const socketChatId = data.chatId;

            if (!socketChatId || socketChatId === expectedChatId) {
              if (data.deleteForEveryone) {
                const messageIndex = this.messages.findIndex(m => m._id === data.messageId);
                if (messageIndex !== -1) {
                  const updatedMessages = [...this.messages];
                  updatedMessages[messageIndex] = {
                    ...updatedMessages[messageIndex],
                    isDeleted: true,
                    content: '',
                    deletedAt: data.deletedAt || new Date().toISOString()
                  };
                  this.messages = updatedMessages;
                  this._cdr.markForCheck();
                }
              } else {
                this.messages = this.messages.filter(m => m._id !== data.messageId);
                this._cdr.markForCheck();
              }
            }
            return;
          }

          if (data.isTypingEvent || data.isTyping !== undefined) {
            return;
          }

          const messages = Array.isArray(data) ? data : [data];
          
          messages.forEach((socketMessage: any) => {
            if (!socketMessage) {
              return;
            }

            if (socketMessage.isTypingEvent || socketMessage.isTyping !== undefined) {
              return;
            }

            if (!socketMessage.content && !socketMessage.urlFile && !socketMessage.metadata?.urlFile) {
              return;
            }

            // Debug only when replyTo is present
            /* if (socketMessage.replyTo) {
             // Debug log removed
            } */

            const senderId = socketMessage.senderId || socketMessage.userId;
            
            if (!senderId) {
              return;
            }

            const isFromOtherUser = senderId === this.otherUserId;
            const isFromCurrentUser = senderId === this.currentUserId;
            
            if (!isFromOtherUser && !isFromCurrentUser) {
              return;
            }

            const messageId = socketMessage._id || socketMessage.messageId || `temp_${Date.now()}_${Math.random()}`;
            const expectedChatId = this.chatId || this._messageService.generateChatId(this.currentUserId!, this.otherUserId!);
            const chatId = socketMessage.chatId || expectedChatId;
            if (!this.chatId && socketMessage.chatId) {
              this.chatId = socketMessage.chatId;
            }

            const receiverId = socketMessage.receiverId || (isFromOtherUser ? this.currentUserId : this.otherUserId);

            let replyMessage: Message | undefined = undefined;
            
            if (socketMessage.replyMessage) {
              replyMessage = this.mapReplyMessageFromSocket(socketMessage.replyMessage);
            } else if (socketMessage.replyTo) {
              const originalMessage = this.messages.find(m => m._id === socketMessage.replyTo);
              if (originalMessage) {
                replyMessage = originalMessage;
              }
            }

            const message: Message = {
              _id: messageId,
              senderId: senderId,
              receiverId: receiverId || (isFromOtherUser ? this.currentUserId : this.otherUserId),
              chatId: chatId,
              content: socketMessage.content || '',
              urlFile: socketMessage.urlFile || socketMessage.metadata?.urlFile,
              timestamp: socketMessage.timestamp || new Date().toISOString(),
              type: this.mapMessageType(socketMessage.type),
              status: socketMessage.status || (isFromCurrentUser ? MessageStatus.SENT : MessageStatus.DELIVERED),
              isRead: socketMessage.isRead || false,
              isEdited: socketMessage.isEdited || false,
              isDeleted: socketMessage.isDeleted || false,
              updatedAt: socketMessage.updatedAt || socketMessage.timestamp || new Date().toISOString(),
              replyTo: socketMessage.replyTo,
              replyMessage: replyMessage
            };

            // Ensure replyMessage is set if replyTo exists
            if (message.replyTo && !message.replyMessage) {
              if (socketMessage.replyMessage) {
                message.replyMessage = this.mapReplyMessageFromSocket(socketMessage.replyMessage);
              } else if (socketMessage.replyTo) {
                const originalMessage = this.messages.find(m => m._id === socketMessage.replyTo);
                if (originalMessage) {
                  message.replyMessage = originalMessage;
                }
              }
            }

            // Debug only when replyTo is present
            /* if (message.replyTo) {
              // Debug log removed
            } */

            const existingMessage = this.messages.find(m => m._id === message._id);
            const existingTempMessage = this.messages.find(m => m._id?.startsWith('temp_') && 
              m.senderId === message.senderId && 
              m.receiverId === message.receiverId &&
              Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime()) < 5000);
            
            if (existingTempMessage) {
              const tempIndex = this.messages.findIndex(m => m._id === existingTempMessage._id);
              if (tempIndex !== -1) {
                if (message.replyTo && !message.replyMessage) {
                  if (socketMessage.replyMessage) {
                    message.replyMessage = this.mapReplyMessageFromSocket(socketMessage.replyMessage);
                  } else {
                    const originalMessage = this.messages.find(m => m._id === message.replyTo);
                    if (originalMessage) {
                      message.replyMessage = originalMessage;
                    }
                  }
                }

                const updatedMessages = [...this.messages];
                updatedMessages[tempIndex] = message;
                this.messages = updatedMessages;
                this.messageSent.emit(message);
                this._cdr.markForCheck();
              }
            } else if (existingMessage) {
              const messageIndex = this.messages.findIndex(m => m._id === message._id);
              if (messageIndex !== -1) {
                const replyMessageChanged = (message.replyMessage && existingMessage.replyMessage?._id !== message.replyMessage?._id) ||
                                          (message.replyTo && !existingMessage.replyTo) ||
                                          (message.replyTo && existingMessage.replyTo && !existingMessage.replyMessage);
                
                const needsUpdate = existingMessage.isRead !== message.isRead ||
                                  existingMessage.content !== message.content ||
                                  existingMessage.urlFile !== message.urlFile ||
                                  existingMessage.status !== message.status ||
                                  existingMessage.replyTo !== message.replyTo ||
                                  replyMessageChanged;
                
                if (needsUpdate) {
                  const updatedMessages = [...this.messages];
                  const updatedMessage: Message = {
                    ...updatedMessages[messageIndex],
                    isRead: message.isRead !== undefined ? message.isRead : updatedMessages[messageIndex].isRead,
                    status: message.status || updatedMessages[messageIndex].status,
                    content: message.content || updatedMessages[messageIndex].content,
                    urlFile: message.urlFile !== undefined ? message.urlFile : updatedMessages[messageIndex].urlFile,
                    replyTo: message.replyTo || updatedMessages[messageIndex].replyTo
                  };

                  if (message.replyMessage) {
                    updatedMessage.replyMessage = message.replyMessage;
                  } else if (message.replyTo && !message.replyMessage) {
                    if (socketMessage.replyMessage) {
                      updatedMessage.replyMessage = this.mapReplyMessageFromSocket(socketMessage.replyMessage);
                    } else {
                      const originalMessage = this.messages.find(m => m._id === message.replyTo);
                      if (originalMessage) {
                        updatedMessage.replyMessage = originalMessage;
                      }
                    }
                  } else if (updatedMessage.replyTo && !updatedMessage.replyMessage) {
                    if (socketMessage.replyMessage) {
                      updatedMessage.replyMessage = this.mapReplyMessageFromSocket(socketMessage.replyMessage);
                    } else {
                      const originalMessage = this.messages.find(m => m._id === updatedMessage.replyTo);
                      if (originalMessage) {
                        updatedMessage.replyMessage = originalMessage;
                      }
                    }
                  }

                  updatedMessages[messageIndex] = updatedMessage;
                  this.messages = updatedMessages;
                  
                  this._cdr.markForCheck();
                }
              }
            } else {
              if (message.replyTo && !message.replyMessage) {
                if (socketMessage.replyMessage) {
                  message.replyMessage = this.mapReplyMessageFromSocket(socketMessage.replyMessage);
                } else {
                  const originalMessage = this.messages.find(m => m._id === message.replyTo);
                  if (originalMessage) {
                    message.replyMessage = originalMessage;
                  }
                }
              }

              // Verify replyMessage before adding
              /* if (message.replyTo && !message.replyMessage) {
                 // Error log removed
              } */

              const updatedMessages = [...this.messages, message];
              this.messages = updatedMessages;
              
              // Verify replyMessage after adding
              const lastMessage = this.messages[this.messages.length - 1];
              /* if (lastMessage.replyTo && !lastMessage.replyMessage) {
                 // Critical log removed
              } */
              
              this.messageSent.emit(message);
              
              // Force change detection for OnPush strategy
              this._cdr.markForCheck();
              setTimeout(() => {
                this._cdr.detectChanges();
              }, 0);
              

              
              if (isFromOtherUser) {
                this.markMessagesAsRead();
                this.otherUserTyping = false;
              }
            }
          });
        }
      });

    this._notificationService.notification$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (notification: any) => {
          if (notification && Array.isArray(notification)) {
            const relevantMessages = notification.filter((msg: Message) => 
              msg && 
              ((msg.senderId === this.currentUserId && msg.receiverId === this.otherUserId) ||
               (msg.senderId === this.otherUserId && msg.receiverId === this.currentUserId))
            );
            
            if (relevantMessages.length > 0) {
              this.updateMessages(relevantMessages);
            }
          }
        }
      });

    this._onSocket('newExternalMessage', (message: ExternalMessage) => {
      if (message.type === TypePublishing.MESSAGE) {
        this.updateContentMessage(
          message.idReference, 
          message.response?.content, 
          message.response?.typeFile, 
          message.response?.urlFile,
          message.response?.replyTo
        );
      }
    });

    this._onSocket('messageRead', (data: any) => {
      if (!data || !data.messageId) {
        return;
      }

      const expectedChatId = this.chatId || this._messageService.generateChatId(this.currentUserId!, this.otherUserId!);
      const socketChatId = data.chatId;

      if (socketChatId && socketChatId !== expectedChatId) {
        return;
      }

      this.updateMessageReadStatus(data.messageId);
    });

    this._onSocket('userTyping', (data: any) => {
      if (!data || !data.userId) {
        return;
      }

      const expectedChatId = this.chatId || this._messageService.generateChatId(this.currentUserId!, this.otherUserId!);
      const socketChatId = data.chatId;

      if (data.userId === this.otherUserId) {
        if (!socketChatId || socketChatId === expectedChatId) {
          const wasTyping = this.otherUserTyping;
          this.otherUserTyping = data.isTyping || false;
          
          if (this.otherUserTyping) {
            if (wasTyping) {
            }
          }
          
          this._cdr.markForCheck();
        }
      }
    });

    this._onSocket('messageEdited', (data: any) => {
      if (!data || !data.messageId || !data.newContent) {
        return;
      }

      if (!this.otherUserId || !this.currentUserId) {
        return;
      }

      const messageIndex = this.messages.findIndex(m => m._id === data.messageId);
      if (messageIndex === -1) {
        return;
      }

      const message = this.messages[messageIndex];
      const isRelevantMessage = (message.senderId === this.currentUserId && message.receiverId === this.otherUserId) ||
                                (message.senderId === this.otherUserId && message.receiverId === this.currentUserId);

      if (!isRelevantMessage) {
        return;
      }

      const expectedChatId = this.chatId || this._messageService.generateChatId(this.currentUserId, this.otherUserId);
      const socketChatId = data.chatId;

      let shouldUpdate = true;

      if (socketChatId) {
        shouldUpdate = socketChatId === expectedChatId;
      }

      if (shouldUpdate && messageIndex !== -1) {
        const updatedMessages = [...this.messages];
        updatedMessages[messageIndex] = {
          ...updatedMessages[messageIndex],
          content: data.newContent,
          isEdited: true,
          updatedAt: data.editedAt || new Date().toISOString()
        };
        this.messages = [...updatedMessages];
        this._cdr.markForCheck();
        this._cdr.detectChanges();
        setTimeout(() => {
          this._cdr.markForCheck();
          this._cdr.detectChanges();
        }, 0);
      }
    });

    this._onSocket('messageDeleted', (data: any) => {
      if (!data || !data.messageId) {
        return;
      }

      const expectedChatId = this.chatId || this._messageService.generateChatId(this.currentUserId!, this.otherUserId!);
      const socketChatId = data.chatId;

      if (!socketChatId || socketChatId === expectedChatId) {
        const messageIndex = this.messages.findIndex(m => m._id === data.messageId);
        if (messageIndex !== -1) {
          if (data.deleteForEveryone) {
            const updatedMessages = [...this.messages];
            updatedMessages[messageIndex] = {
              ...updatedMessages[messageIndex],
              isDeleted: true,
              content: '',
              deletedAt: data.deletedAt || new Date().toISOString()
            };
            this.messages = updatedMessages;
          } else {
            this.messages = this.messages.filter(m => m._id !== data.messageId);
          }
          this._cdr.markForCheck();
        }
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['otherUserId'] && this.otherUserId) {
      this.loadOtherUserInfo();
      this.currentPage = 1;
      
      if (this.currentUserId && this.otherUserId) {
        this.joinChatRoom();
      }
      this.loadingMoreMessages = false;

      const userStatuses = this._notificationUsersService.getUserStatuses();
      const otherUser = userStatuses.find(user => user.id === this.otherUserId);
      if (otherUser && otherUser.status) {
        const status = otherUser.status as 'online' | 'inactive' | 'offLine';
        if (status === 'online' || status === 'inactive' || status === 'offLine') {
          this.otherUserStatus = status;
        } else {
          this.otherUserStatus = null;
        }
      } else {
        this.otherUserStatus = null;
      }
      this._cdr.markForCheck();
    }
    if (changes['totalPages'] && changes['totalPages'].currentValue !== undefined) {
      this.hasMoreMessages = this.totalPages > 1;
    }
    if (changes['messages'] && this.messages.length > 0) {
      const isFirstLoad = changes['messages'].previousValue && changes['messages'].previousValue.length === 0;
      
      if (isFirstLoad) {
        this.hasMoreMessages = this.totalPages > 1 || this.messages.length >= 25;
        setTimeout(() => {
          this.markMessagesAsRead();
        }, 800);
      }
    }

    if (changes['otherUserId'] && this.otherUserId && this.messages && this.messages.length > 0) {
      setTimeout(() => {
        this.markMessagesAsRead();
      }, 1000);
    }
  }

  ngAfterViewInit() {
  }

  ngAfterViewChecked() {
  }

  @HostListener('window:focus')
  onWindowFocus() {
    if (this.otherUserId && this.messages.length > 0) {
      setTimeout(() => {
        this.markMessagesAsRead();
      }, 500);
    }
  }

  @HostListener('window:visibilitychange')
  onVisibilityChange() {
    if (!document.hidden && this.otherUserId && this.messages.length > 0) {
      setTimeout(() => {
        this.markMessagesAsRead();
      }, 500);
    }
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();

    this._socketHandlers.forEach(({ event, handler }) => {
      this._socketService.removeEventListener(event, handler);
    });
    this._socketHandlers.length = 0;

    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    if (this.isTyping && this.otherUserId && this.currentUserId) {
      const chatId = this.chatId || this._messageService.generateChatId(this.currentUserId, this.otherUserId);
      this._socketService.emitEvent('typingStop', {
        userId: this.currentUserId,
        chatId: chatId,
      });
    }
  }

  sendMessage(type: string = this.plainText, content?: string, urlFile?: string) {
    if (this.messageContent.trim() === '' && type === this.plainText) return;
    if (!this.otherUserId || this.isSending) return;

    const messageContent = type === this.plainText ? this.messageContent : content;
    const finalContent = messageContent !== undefined ? messageContent : this.messageContent.trim();
    
    let messageType = MessageType.TEXT;
    let finalUrlFile = urlFile;
    
    if (type === 'gifContent' || this.isGifContent(finalContent)) {
      messageType = MessageType.IMAGE;
      if (!finalUrlFile && finalContent) {
        finalUrlFile = this.extractUrlFromContent(finalContent);
      }
    }
    
    const messageData: CreateMessageDto = {
      receiverId: this.otherUserId,
      content: finalContent,
      type: messageType,
      urlFile: finalUrlFile,
      replyTo: this.replyingToMessage?._id
    };

    this.isSending = true;
    this._cdr.markForCheck();

    const tempMessageId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tempMessage: Message = {
      _id: tempMessageId,
      senderId: this.currentUserId!,
      receiverId: this.otherUserId!,
      chatId: '',
      content: finalContent,
      urlFile: finalUrlFile,
      timestamp: new Date().toISOString(),
      type: messageType,
      status: 'sent' as any,
      isRead: false,
      isEdited: false,
      isDeleted: false,
      updatedAt: new Date().toISOString(),
      replyTo: this.replyingToMessage?._id,
      replyMessage: this.replyingToMessage || undefined
    };

    this.messageSent.emit(tempMessage);
    this.messageContent = '';
    this.replyingToMessage = null;
    this.isSending = false;
    
    const textarea = document.querySelector('textarea');
    if (textarea) {
      textarea.style.height = '40px';
    }


    this._cdr.markForCheck();

    this._messageService.createMessage(messageData).pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: (newMessage) => {
        const chatId = newMessage.chatId || this.chatId || this._messageService.generateChatId(this.currentUserId!, this.otherUserId!);
        if (!this.chatId && newMessage.chatId) {
          this.chatId = newMessage.chatId;
        }
        const messageWithChatId = { ...newMessage, chatId };
        
        if (messageWithChatId.replyTo) {
          // Debug log removed
        }
        
        const userName = this.decodedToken.name || this.decodedToken.username || '';
        // Normalize avatar URL before sending notification
        const normalizedAvatar = this.decodedToken.avatar ? this._utilityService.normalizeImageUrl(this.decodedToken.avatar, environment.MINIO_BUCKET_URL || '') : this.decodedToken.avatar;
        const userInfo = {
          userId: this.currentUserId!,
          userName: userName,
          userAvatar: normalizedAvatar
        };
        
        this._notificationMessageChatService.sendNotificationMessageChat(messageWithChatId, userInfo);
        this._notificationService.sendNotification();
        this.messageSent.emit(messageWithChatId);
        
        if (type === MediaType.PROCESSING) {
          this._fileUploadService.uploadFile(this.selectedFiles, 'messages', newMessage._id, '', TypePublishing.MESSAGE)
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe();
        }


        this._cdr.markForCheck();
      },
      error: (error) => {
        this.isSending = false;
        const errorMessage: Message = {
          ...tempMessage,
          _id: `error_${tempMessageId}`,
          status: 'error' as any
        };
        this.messageSent.emit(errorMessage);
        this._logService.log(
          LevelLogEnum.ERROR,
          'ChatWindowComponent',
          'Error sending message',
          { error: String(error), messageData }
        );
        this._cdr.markForCheck();
      }
    });
  }

  handleTyping(content?: string) {
    if (content !== undefined) {
      this.messageContent = content;
    }
    
    if (!this.otherUserId || !this.currentUserId) {
      return;
    }

    const chatId = this.chatId || this._messageService.generateChatId(this.currentUserId, this.otherUserId);

    if (!this.isTyping) {
      this.isTyping = true;
      this._socketService.emitEvent('typingStart', {
        userId: this.currentUserId,
        userName: this.decodedToken.name,
        chatId: chatId,
        receiverId: this.otherUserId
      });
    }

    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    if (this.messageContent.trim() === '') {
      this.isTyping = false;
      this._socketService.emitEvent('typingStop', {
        userId: this.currentUserId,
        chatId: chatId,
        receiverId: this.otherUserId
      });
      return;
    }

    this.typingTimeout = setTimeout(() => {
      this.isTyping = false;
      this._socketService.emitEvent('typingStop', {
        userId: this.currentUserId,
        chatId: chatId,
        receiverId: this.otherUserId
      });
    }, 3000);
  }



  async loadMoreMessages(page: number) {
    if (!this.otherUserId || !this.currentUserId || this.loadingMoreMessages || !this.hasMoreMessages) {
      return;
    }

    if (page <= this.currentPage || page > this.totalPages) {
      return;
    }

    this.loadingMoreMessages = true;
    this.currentPage = page;

    try {
      const response = await firstValueFrom(
        this._messageService.getMessagesWithUser(this.otherUserId, page, 25, 'DESC')
          .pipe(takeUntil(this.unsubscribe$))
      );

      if (response && response.messages && response.messages.length > 0) {
        const existingIds = new Set(this.messages.map(m => m._id));
        const newMessages = response.messages.filter((msg: Message) => !existingIds.has(msg._id));

        if (newMessages.length > 0) {
          const sortedNewMessages = newMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          this.messages = [...sortedNewMessages, ...this.messages];
          this.hasMoreMessages = page < this.totalPages;
          this._cdr.markForCheck();
        } else {
          this.hasMoreMessages = page < this.totalPages;
        }
      } else {
        this.hasMoreMessages = page < this.totalPages;
      }
    } catch (error) {
      this.hasMoreMessages = false;
      this._logService.log(
        LevelLogEnum.ERROR,
        'ChatWindowComponent',
        'Error loading more messages',
        { error: String(error) }
      );
    } finally {
      this.loadingMoreMessages = false;
      this._cdr.markForCheck();
    }
  }

  isOwnMessage(message: Message): boolean {
    return message.senderId === this.currentUserId;
  }

  hasReply(message: Message): boolean {
    const hasReply = !!(message.replyTo && message.replyMessage);
    // Debug: log only when replyTo exists but replyMessage is missing
    /* if (message.replyTo && !message.replyMessage) {
       // Error log removed
    } */
    return hasReply;
  }

  private mapMessageType(type: string | undefined): MessageType {
    if (!type) return MessageType.TEXT;
    
    const typeMap: { [key: string]: MessageType } = {
      'text': MessageType.TEXT,
      'image': MessageType.IMAGE,
      'video': MessageType.VIDEO,
      'audio': MessageType.AUDIO,
      'file': MessageType.FILE
    };
    
    return typeMap[type.toLowerCase()] || MessageType.TEXT;
  }

  private mapReplyMessageFromSocket(replyMessage: any): Message {
    if (!replyMessage) return null as any;

    const messageId = replyMessage._id || replyMessage.messageId || '';
    const senderId = replyMessage.senderId || replyMessage.userId || '';
    
    return {
      _id: messageId,
      senderId: senderId,
      receiverId: '', // Not available in socket replyMessage
      chatId: replyMessage.chatId || '',
      content: replyMessage.content || '',
      urlFile: replyMessage.urlFile || replyMessage.metadata?.urlFile,
      timestamp: replyMessage.timestamp || new Date().toISOString(),
      type: this.mapMessageType(replyMessage.type),
      status: MessageStatus.SENT,
      isRead: false,
      isEdited: false,
      isDeleted: false,
      updatedAt: replyMessage.timestamp || new Date().toISOString()
    };
  }

  private loadOtherUserInfo() {
    if (!this.otherUserId) return;

    this.isLoadingUser = true;
    this._cdr.markForCheck();

    this._userService.getUserById(this.otherUserId)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (user: User) => {
          this.otherUserInfo = user;
          this.isLoadingUser = false;
          this._cdr.markForCheck();
        },
        error: (error: any) => {
          this.isLoadingUser = false;
          this._logService.log(
            LevelLogEnum.ERROR,
            'ChatWindowComponent',
            'Error loading other user info',
            { error: String(error), userId: this.otherUserId }
          );
          this._cdr.markForCheck();
        }
      });
  }

  get otherUserName(): string {
    if (!this.otherUserInfo) return this.otherUserId || '';
    const fullName = `${this.otherUserInfo.name || ''} ${this.otherUserInfo.lastName || ''}`.trim();
    return fullName || this.otherUserInfo.username || this.otherUserId || '';
  }

  get otherUserAvatar(): string | null {
    return this.otherUserInfo?.avatar || null;
  }



  trackByMessageId(index: number, message: Message): string {
    // Include replyTo and replyMessage in trackBy to force re-render when reply is added
    const replyKey = message.replyTo && message.replyMessage ? `_reply_${message.replyTo}_${message.replyMessage._id}` : '';
    return `${message._id}_${message.isEdited ? 'edited' : ''}_${message.updatedAt || message.timestamp}${replyKey}`;
  }

  private updateMessageReadStatus(messageId: string) {
    if (!messageId || !this.currentUserId) {
      return;
    }

    const messageIndex = this.messages.findIndex(m => m._id === messageId);

    if (messageIndex === -1) {
      return;
    }

    const message = this.messages[messageIndex];
    const isOwnMessage = message.senderId === this.currentUserId;

    if (!isOwnMessage) {
      return;
    }

    if (message.isRead && message.status === MessageStatus.READ) {
      return;
    }

    const updatedMessages = this.messages.map((msg, idx) => {
      if (idx === messageIndex) {
        return {
          ...msg,
          isRead: true,
          status: MessageStatus.READ
        };
      }
      return msg;
    });

    this.messages = updatedMessages;
    this._cdr.markForCheck();
    this._cdr.detectChanges();
  }



  openGifSearch() {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.width = '540px';
    dialogConfig.height = '500px';
    dialogConfig.panelClass = 'gifSearch-modal-container';

    const dialogRef = this._dialog.open(GifSearchComponent, dialogConfig);

    dialogRef.componentInstance.gifSelected.subscribe((gifUrl: string) => {
      dialogRef.close();
      this.onGifSelected(gifUrl);
    });
  }

  onGifSelected(gifUrl: string) {
    this.sendMessage('gifContent', `![GIF](${gifUrl})`, gifUrl);
  }

  private isGifContent(content: string): boolean {
    if (!content) return false;
    const gifPattern = /!\[GIF\]\(/i;
    const urlGifPattern = /\.gif(\?|$)/i;
    return gifPattern.test(content) || urlGifPattern.test(content);
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
        this.uploadFiles();
      }
    });
  }

  private async uploadFiles() {
    this.sendMessage(MediaType.PROCESSING, MediaType.PROCESSING);
  }

  isVideoUrl(url: string): boolean {
    return /\.(mp4|ogg|webm|avi|mov)$/i.test(url);
  }

  getThumbnail(message: string): string {
    if (!message) return '';
    const patron = /\(([^)]+)\)/;
    const match = message.match(patron);
    if (match && match[1]) {
      return match[1];
    }
    return '';
  }

  private extractUrlFromContent(content: string): string {
    if (!content) return '';
    const patron = /\(([^)]+)\)/;
    const match = content.match(patron);
    if (match && match[1]) {
      return match[1];
    }
    return '';
  }

  openUrl(url: string): void {
    if (url) window.open(url, '_blank');
  }





  markMessagesAsRead() {
    if (!this.otherUserId || !this.currentUserId || this.messages.length === 0) {
      return;
    }

    const unreadMessages = this.messages.filter(m => 
      m.senderId === this.otherUserId && 
      m.receiverId === this.currentUserId && 
      !m.isRead
    );

    if (unreadMessages.length === 0) {
      return;
    }

    const chatId = this.chatId || this._messageService.generateChatId(this.currentUserId, this.otherUserId);

    this._messageService.markMessagesAsRead({ chatId, senderId: this.otherUserId })
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (updatedMessages: Message[]) => {
          if (updatedMessages && Array.isArray(updatedMessages) && updatedMessages.length > 0) {
            this._notificationService.sendNotification(updatedMessages);
            this.updateMessages(updatedMessages);
            
            const updatedMessageIds = new Set(updatedMessages.map(m => m._id));
            const unreadMessageIds = unreadMessages.map(m => m._id);
            
            const allUpdated = unreadMessageIds.every(id => updatedMessageIds.has(id));
            
            if (!allUpdated) {
              const updatedMessagesMap = new Map(updatedMessages.map(m => [m._id, m]));
              const updatedLocalMessages = this.messages.map(msg => {
                if (msg.senderId === this.otherUserId && 
                    msg.receiverId === this.currentUserId && 
                    !msg.isRead) {
                  const updatedMsg = updatedMessagesMap.get(msg._id);
                  if (updatedMsg) {
                    return {
                      ...msg,
                      isRead: updatedMsg.isRead !== undefined ? updatedMsg.isRead : true,
                      status: updatedMsg.status || MessageStatus.READ,
                      replyTo: msg.replyTo,
                      replyMessage: msg.replyMessage
                    };
                  }
                  return {
                    ...msg,
                    isRead: true,
                    status: MessageStatus.READ,
                    replyTo: msg.replyTo,
                    replyMessage: msg.replyMessage
                  };
                }
                return msg;
              });
              
              this.messages = updatedLocalMessages;
            }
          } else {
            const updatedLocalMessages = this.messages.map(msg => {
              if (msg.senderId === this.otherUserId && 
                  msg.receiverId === this.currentUserId && 
                  !msg.isRead) {
                return {
                  ...msg,
                  isRead: true,
                  status: MessageStatus.READ,
                  replyTo: msg.replyTo,
                  replyMessage: msg.replyMessage
                };
              }
              return msg;
            });
              
              this.messages = updatedLocalMessages;
            }

            unreadMessages.forEach(msg => {
            if (!this._socketService.isConnected()) {
              return;
            }

              this._socketService.emitEvent('messageRead', {
                messageId: msg._id,
                chatId: chatId,
                userId: this.currentUserId
              });
            });
            
            this._cdr.markForCheck();
        },
        error: (error) => {
          this._logService.log(
            LevelLogEnum.ERROR,
            'ChatWindowComponent',
            'Error marking messages as read',
            { error: String(error), chatId, senderId: this.otherUserId }
          );
        }
      });
  }

  private updateMessages(newMessages: Message[]): void {
    if (!newMessages || !Array.isArray(newMessages)) {
      return;
    }

    let hasChanges = false;
    const updatedMessages = [...this.messages];

    newMessages.forEach(newMessage => {
      if (!newMessage || !newMessage._id) {
        return;
      }

      const existingIndex = updatedMessages.findIndex(message => message._id === newMessage._id);

      if (existingIndex !== -1) {
        const existingMessage = updatedMessages[existingIndex];
        const isReadChanged = existingMessage.isRead !== newMessage.isRead;
        const contentChanged = existingMessage.content !== newMessage.content;
        const urlFileChanged = existingMessage.urlFile !== newMessage.urlFile;
        const replyToChanged = existingMessage.replyTo !== newMessage.replyTo;
        
        if (isReadChanged || contentChanged || urlFileChanged || replyToChanged) {
          const updatedMessage: Message = {
            ...existingMessage,
            isRead: newMessage.isRead !== undefined ? newMessage.isRead : existingMessage.isRead,
            content: newMessage.content || existingMessage.content,
            urlFile: newMessage.urlFile || existingMessage.urlFile,
            replyTo: newMessage.replyTo || existingMessage.replyTo,
            replyMessage: newMessage.replyMessage || existingMessage.replyMessage
          };

          if (updatedMessage.replyTo && !updatedMessage.replyMessage) {
            const originalMessage = updatedMessages.find(m => m._id === updatedMessage.replyTo) || 
                                   newMessages.find(m => m._id === updatedMessage.replyTo);
            if (originalMessage) {
              updatedMessage.replyMessage = originalMessage;
            }
          } else if (newMessage.replyMessage) {
            updatedMessage.replyMessage = newMessage.replyMessage;
          }

          updatedMessages[existingIndex] = updatedMessage;
          hasChanges = true;
        }
      } else {
        if (newMessage.replyTo && !newMessage.replyMessage) {
          const originalMessage = updatedMessages.find(m => m._id === newMessage.replyTo) || 
                                 newMessages.find(m => m._id === newMessage.replyTo);
          if (originalMessage) {
            newMessage.replyMessage = originalMessage;
          }
        }
        updatedMessages.push(newMessage);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.messages = updatedMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      this._cdr.markForCheck();
    }
  }

  private updateContentMessage(idMessage: string, contentMessage: string, typeFile: string, urlFile: string, replyTo?: string) {
    if (!idMessage) return;
    
    const messageIndex = this.messages.findIndex(message => message._id === idMessage);
    if (messageIndex === -1) return;
    
    const updatedMessages = [...this.messages];
    const messageToUpdate = { ...updatedMessages[messageIndex] };
    
    messageToUpdate.content = contentMessage;
    messageToUpdate.type = typeFile as MessageType;
    messageToUpdate.urlFile = urlFile;
    
    if (replyTo) {
      messageToUpdate.replyTo = replyTo;
      const originalMessage = this.messages.find(m => m._id === replyTo);
      if (originalMessage) {
        messageToUpdate.replyMessage = originalMessage;
      }
    }
    
    updatedMessages[messageIndex] = messageToUpdate;
    this.messages = updatedMessages;
    this._cdr.markForCheck();
    this._notificationService.sendNotification(this.messages);
  }

  private joinChatRoom() {
    if (!this.currentUserId || !this.otherUserId) {
      return;
    }

    const resolvedChatId = this.chatId || this._messageService.generateChatId(this.currentUserId, this.otherUserId);

    if (this._socketService.isConnected()) {
      this._socketService.emitEvent('joinChat', {
        chatId: resolvedChatId,
        userId: this.currentUserId
      });
    } else {
      if (this._connectionSubscription) {
        this._connectionSubscription.unsubscribe();
      }

      this._connectionSubscription = this._socketService.connectionStatus
        .pipe(takeUntil(this.unsubscribe$))
        .subscribe({
          next: (state) => {
            if (state.connected && this.currentUserId && this.otherUserId) {
              const resolvedChatId = this.chatId || this._messageService.generateChatId(this.currentUserId, this.otherUserId);

              this._socketService.emitEvent('joinChat', {
                chatId: resolvedChatId,
                userId: this.currentUserId
              });

              if (this._connectionSubscription) {
                this._connectionSubscription.unsubscribe();
                this._connectionSubscription = null;
              }
            }
          }
        });
    }
  }

  goBack() {
    if (this.isMobile) {
      this.backClicked.emit();
    }
  }

  startEditMessage(message: Message) {
    if (message.type !== MessageType.TEXT || message.isDeleted) {
      return;
    }

    this.editingMessageId = message._id;
    this.editingMessageContent = message.content;
    
    setTimeout(() => {
      const messageIndex = this.messages.findIndex(m => m._id === message._id);
      const isLastMessage = this.messages.length > 0 && messageIndex === this.messages.length - 1;

      const editInput = document.querySelector(`[data-edit-input="${message._id}"]`) as HTMLTextAreaElement;
      if (editInput) {
        editInput.focus();
        editInput.select();
      }

      if (isLastMessage) {
        // Scroll handled by chat-list component
      } else {
        const messageElement = document.querySelector(`[data-message-id="${message._id}"]`);
        if (messageElement) {
          messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 100);

    this._cdr.markForCheck();
  }

  saveEditedMessage(messageId: string, event?: Event) {
    if (event && event instanceof KeyboardEvent) {
      if (event.shiftKey) {
        return;
      }
      event.preventDefault();
    }

    if (!this.editingMessageContent.trim() || !this.otherUserId || !this.currentUserId) {
      this.cancelEdit();
      return;
    }

    const message = this.messages.find(m => m._id === messageId);
    if (!message || message.content === this.editingMessageContent.trim()) {
      this.cancelEdit();
      return;
    }

    const chatId = this.chatId || this._messageService.generateChatId(this.currentUserId, this.otherUserId);

    this._messageService.updateMessage(messageId, {
      content: this.editingMessageContent.trim()
    }).pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: (updatedMessage: Message) => {
        const messageIndex = this.messages.findIndex(m => m._id === messageId);
        if (messageIndex !== -1) {
          const updatedMessages = [...this.messages];
          updatedMessages[messageIndex] = {
            ...updatedMessages[messageIndex],
            content: updatedMessage.content,
            isEdited: true,
            updatedAt: updatedMessage.updatedAt
          };
          this.messages = updatedMessages;
        }

        if (this._socketService.isConnected()) {
          this._socketService.emitEvent('editMessage', {
            messageId: messageId,
            chatId: chatId,
            userId: this.currentUserId,
            newContent: updatedMessage.content,
            editedAt: updatedMessage.updatedAt
          });
        } else {
          this._logService.log(
            LevelLogEnum.ERROR,
            'ChatWindowComponent',
            'Socket not connected, cannot emit editMessage event',
            { messageId, chatId }
          );
        }

        this.cancelEdit();
        this._cdr.markForCheck();
      },
      error: (error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'ChatWindowComponent',
          'Error editing message',
          { error: String(error), messageId }
        );
        this.cancelEdit();
        this._cdr.markForCheck();
      }
    });
  }

  cancelEdit() {
    this.editingMessageId = null;
    this.editingMessageContent = '';
    this._cdr.markForCheck();
  }

  startReplyToMessage(message: Message) {
    if (message.isDeleted) {
      return;
    }

    this.replyingToMessage = message;
    
    setTimeout(() => {
      const messageInput = document.querySelector('textarea.message-input') as HTMLTextAreaElement;
      if (messageInput) {
        messageInput.focus();
      }
    }, 100);

    this._cdr.markForCheck();
  }

  cancelReply() {
    this.replyingToMessage = null;
    this._cdr.markForCheck();
  }

  getReplyMessagePreview(message: Message): string {
    if (!message || !message.content) return '';
    
    const maxLength = 50;
    if (message.content.length > maxLength) {
      return message.content.substring(0, maxLength) + '...';
    }
    
    return message.content;
  }

  confirmDeleteMessage(message: Message) {
    const deleteConfirmText = translations['messages.deleteConfirm'] || '¿Estás seguro de que deseas eliminar este mensaje?';
    const deleteButtonText = translations['messages.delete'] || 'Eliminar';
    const cancelButtonText = 'Cancelar';

    this._alertService.showConfirmation(
      '',
      deleteConfirmText,
      deleteButtonText,
      cancelButtonText,
      Alerts.QUESTION,
      Position.CENTER
    ).pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: (confirmed: boolean) => {
        if (confirmed) {
          this.deleteMessage(message, true);
        }
      }
    });
  }

  deleteMessage(message: Message, deleteForEveryone: boolean = true) {
    if (!this.otherUserId || !this.currentUserId) {
      return;
    }

    const chatId = this.chatId || this._messageService.generateChatId(this.currentUserId, this.otherUserId);

    this._messageService.deleteMessage(message._id).pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: () => {
        if (deleteForEveryone) {
          const messageIndex = this.messages.findIndex(m => m._id === message._id);
          if (messageIndex !== -1) {
            const updatedMessages = [...this.messages];
            updatedMessages[messageIndex] = {
              ...updatedMessages[messageIndex],
              isDeleted: true,
              content: '',
              deletedAt: new Date().toISOString()
            };
            this.messages = updatedMessages;
          }
        } else {
          this.messages = this.messages.filter(m => m._id !== message._id);
        }

        this._socketService.emitEvent('deleteMessage', {
          messageId: message._id,
          chatId: chatId,
          userId: this.currentUserId,
          deleteForEveryone: deleteForEveryone
        });

        this._cdr.markForCheck();
      },
      error: (error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'ChatWindowComponent',
          'Error deleting message',
          { error: String(error), messageId: message._id }
        );
        this._cdr.markForCheck();
      }
    });
  }

  private setupMessageOptions(): void {
    this.messageOptions = [
      {
        title: translations['messages.edit'] || 'Editar',
        icon: 'edit',
        function: (message: Message) => this.startEditMessage(message),
      },
      {
        title: translations['messages.delete'] || 'Eliminar',
        icon: 'delete',
        function: (message: Message) => this.confirmDeleteMessage(message),
      },
    ];
  }

  handleMessageAction(action: string, message: Message): void {
    if (action === 'edit') {
      this.startEditMessage(message);
    } else if (action === 'delete') {
      this.deleteMessage(message);
    }
  }

  private preloadEmojiMartCss() {
    if (!this._lazyCssService.isLoaded('emoji-mart')) {
      this._lazyCssService.loadEmojiMartCss().catch((error: unknown) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'ChatWindowComponent',
          'Error loading emoji-mart CSS',
          { error: String(error) }
        );
      });
    }
  }
}
