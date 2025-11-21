import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Subject, takeUntil, distinctUntilChanged, map } from 'rxjs';

import { MessageService } from './services/message.service';
import { Conversation, PaginatedResponse } from './interfaces/conversation.interface';
import { Message, MessageType } from './interfaces/message.interface';
import { AuthService } from '@auth/services/auth.service';
import { Token } from '@shared/interfaces/token.interface';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { DeviceDetectionService } from '@shared/services/device-detection.service';
import { NotificationMessageChatService } from '@shared/services/notifications/notificationMessageChat.service';
import { SocketService } from '@shared/services/socket.service';

@Component({
  selector: 'worky-messages',
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessagesComponent implements OnInit, OnDestroy {
  private unsubscribe$ = new Subject<void>();

  conversations: Conversation[] = [];
  selectedUserId: string | null = null;
  messages: Message[] = [];
  messagesTotalPages: number = 1;
  currentUserId: string | null = null;

  isLoadingConversations = false;
  isLoadingMessages = false;
  isInitialLoad = true;
  error: string | null = null;

  page = 1;
  pageSize = 20;
  totalPages = 1;

  isMobile = false;

  decodedToken!: Token;

constructor(
    private _messageService: MessageService,
    private _authService: AuthService,
    private _router: Router,
    private _activatedRoute: ActivatedRoute,
    private _location: Location,
    private _cdr: ChangeDetectorRef,
    private _logService: LogService,
    private _deviceDetectionService: DeviceDetectionService,
    private _notificationMessageChatService: NotificationMessageChatService,
    private _socketService: SocketService
  ) {
this.isMobile = this._deviceDetectionService.isMobile();
  }

  ngOnInit() {
    this.decodedToken = this._authService.getDecodedToken()!;
    this.currentUserId = this.decodedToken.id;

    this._activatedRoute.params
      .pipe(
        map(params => params['userIdMessages']),
        distinctUntilChanged(),
        takeUntil(this.unsubscribe$)
      )
      .subscribe(userId => {
        if (userId && userId !== this.selectedUserId) {
          this.selectedUserId = userId;
          this.messagesTotalPages = 1;
          const wasInitialLoad = this.isInitialLoad;
          this.messages = [];
          this.isInitialLoad = wasInitialLoad;
          if (!wasInitialLoad) {
            this.isLoadingMessages = false;
          }
          this.loadMessages(userId);
        } else if (!userId && this.selectedUserId !== null) {
          this.selectedUserId = null;
          this.messages = [];
          this.messagesTotalPages = 1;
          this.isInitialLoad = true;
          this.isLoadingMessages = false;
        }
        this._cdr.markForCheck();
      });

    this.loadConversations();
    this.setupSocketListeners();
    this.setupConnectionHandler();
  }

  private setupConnectionHandler() {
    this._socketService.connectionStatus
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (connected: boolean) => {
          if (connected && this.currentUserId) {
            setTimeout(() => {
              this.joinAllChatRooms();
            }, 500);
          }
        }
      });
  }

  private setupSocketListeners() {
    this._socketService.listenEvent('messageRead', (data: any) => {
      if (!data || !data.messageId) {
        return;
      }

      if (this.selectedUserId) {
        const expectedChatId = this._messageService.generateChatId(this.currentUserId!, this.selectedUserId);
        const socketChatId = data.chatId;

        if (socketChatId && socketChatId !== expectedChatId) {
          return;
        }

        const messageIndex = this.messages.findIndex(m => m._id === data.messageId);
        if (messageIndex !== -1) {
          const message = this.messages[messageIndex];
          const isOwnMessage = message.senderId === this.currentUserId;

          if (isOwnMessage) {
            const updatedMessages = [...this.messages];
            updatedMessages[messageIndex] = {
              ...updatedMessages[messageIndex],
              isRead: true,
              status: 'read' as any
            };
            this.messages = updatedMessages;
            this._cdr.markForCheck();
          }
        }
      }
    });

    this._socketService.listenEvent('messageEdited', (data: any) => {
      if (!data || !data.messageId) {
        return;
      }

      if (!this.currentUserId) {
        return;
      }

      let otherUserId: string | null = null;
      const socketChatId = data.chatId;

      if (socketChatId) {
        const chatIdParts = socketChatId.split('_');
        if (chatIdParts.length === 2) {
          otherUserId = chatIdParts[0] === this.currentUserId ? chatIdParts[1] : chatIdParts[0];
        } else if (socketChatId.includes('_')) {
          const parts = socketChatId.split('_').filter((p: string) => p && p !== this.currentUserId);
          if (parts.length > 0) {
            otherUserId = parts[0];
          }
        }
      }

      if (!otherUserId) {
        const message = this.messages.find(m => m._id === data.messageId);
        if (message) {
          otherUserId = message.senderId === this.currentUserId ? message.receiverId : message.senderId;
        }
      }

      if (!otherUserId) {
        return;
      }

      const isCurrentChat = otherUserId === this.selectedUserId;

      if (isCurrentChat) {
        const messageIndex = this.messages.findIndex(m => m._id === data.messageId);
        if (messageIndex !== -1) {
          const updatedMessages = [...this.messages];
          updatedMessages[messageIndex] = {
            ...updatedMessages[messageIndex],
            content: data.newContent || updatedMessages[messageIndex].content,
            isEdited: true,
            updatedAt: data.editedAt || new Date().toISOString()
          };
          this.messages = updatedMessages;
          this._cdr.markForCheck();
          this._cdr.detectChanges();
        }
      }

      const conversationIndex = this.conversations.findIndex(c => c.userId === otherUserId);
      if (conversationIndex !== -1) {
        const conversation = this.conversations[conversationIndex];
        const updatedConversation: Conversation = {
          ...conversation,
          lastMessage: data.newContent || conversation.lastMessage,
          lastMessageDate: data.editedAt || conversation.lastMessageDate
        };
        this.conversations[conversationIndex] = updatedConversation;
        this.sortConversationsByDate();
        this._cdr.markForCheck();
      }
    });

    this._socketService.listenEvent('messageDeleted', (data: any) => {
      if (!data || !data.messageId || !data.chatId) {
        return;
      }

      const chatUserIds = data.chatId.split('_');
      if (chatUserIds.length !== 2) {
        return;
      }

      const otherUserId = chatUserIds[0] === this.currentUserId ? chatUserIds[1] : chatUserIds[0];
      const isCurrentChat = otherUserId === this.selectedUserId;

      if (isCurrentChat) {
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

      const conversationIndex = this.conversations.findIndex(c => c.userId === otherUserId);
      if (conversationIndex !== -1 && data.deleteForEveryone) {
        const conversation = this.conversations[conversationIndex];
        const updatedConversation: Conversation = {
          ...conversation,
          lastMessage: 'messages.deleted' as any,
          lastMessageDate: data.deletedAt || conversation.lastMessageDate
        };
        this.conversations[conversationIndex] = updatedConversation;
        this.sortConversationsByDate();
        this._cdr.markForCheck();
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
            if (this.selectedUserId && data.messageId && data.chatId) {
              const expectedChatId = this._messageService.generateChatId(this.currentUserId!, this.selectedUserId);
              const socketChatId = data.chatId;

              if (socketChatId === expectedChatId) {
                const messageIndex = this.messages.findIndex(m => m._id === data.messageId);
                if (messageIndex !== -1) {
                  const message = this.messages[messageIndex];
                  const isOwnMessage = message.senderId === this.currentUserId;

                  if (isOwnMessage) {
                    const updatedMessages = [...this.messages];
                    updatedMessages[messageIndex] = {
                      ...updatedMessages[messageIndex],
                      isRead: true,
                      status: 'read' as any
                    };
                    this.messages = updatedMessages;
                    this._cdr.markForCheck();
                  }
                }
              }
            }
            return;
          }

          const messages = Array.isArray(data) ? data : [data];
          
          messages.forEach((message: any) => {
            if (!message) {
              return;
            }

            if (message.isTypingEvent || message.isTyping !== undefined) {
              return;
            }

            if (!message.content && !message.urlFile && !message.metadata?.urlFile) {
              return;
            }

            const messageId = message._id || message.messageId;
            if (!messageId) {
              return;
            }

            const senderId = message.senderId || message.userId;
            const receiverId = message.receiverId;

            if (!senderId) {
              return;
            }

            const isFromOtherUser = senderId !== this.currentUserId;
            const isFromCurrentUser = senderId === this.currentUserId;
            
            const socketChatId = message.chatId;
            let inferredReceiverId = receiverId;
            let otherUserId: string | null = null;
            
            if (receiverId) {
              if (receiverId === this.currentUserId) {
                otherUserId = senderId;
                inferredReceiverId = this.currentUserId;
              } else {
                otherUserId = receiverId;
                inferredReceiverId = senderId;
              }
            } else if (socketChatId) {
              const chatUserIds = socketChatId.split('_');
              if (chatUserIds.length === 2) {
                inferredReceiverId = chatUserIds[0] === this.currentUserId ? chatUserIds[1] : chatUserIds[0];
                otherUserId = isFromOtherUser ? senderId : (inferredReceiverId || receiverId);
              } else {
                otherUserId = isFromOtherUser ? senderId : (receiverId || null);
              }
            } else if (isFromOtherUser) {
              otherUserId = senderId;
              inferredReceiverId = this.currentUserId!;
            } else {
              otherUserId = receiverId || null;
            }

            const isToCurrentUser = (receiverId === this.currentUserId) ||
                                     (inferredReceiverId === this.currentUserId) ||
                                     (isFromOtherUser && !receiverId && !inferredReceiverId);


            if (!otherUserId) {
              return;
            }

            const expectedChatId = this._messageService.generateChatId(this.currentUserId!, otherUserId);
            const chatId = socketChatId && socketChatId === expectedChatId ? socketChatId : expectedChatId;

            const isCurrentChat = otherUserId === this.selectedUserId;
            
            if (isCurrentChat) {
              const existingMessageIndex = this.messages.findIndex(m => m._id === messageId);
              if (existingMessageIndex !== -1) {
                const existingMessage = this.messages[existingMessageIndex];
                const needsUpdate = existingMessage.isRead !== message.isRead ||
                                  existingMessage.content !== message.content ||
                                  existingMessage.urlFile !== message.urlFile ||
                                  existingMessage.status !== message.status;
                
                if (needsUpdate) {
                  const updatedMessages = [...this.messages];
                  updatedMessages[existingMessageIndex] = {
                    ...existingMessage,
                    isRead: message.isRead !== undefined ? message.isRead : existingMessage.isRead,
                    status: message.status || existingMessage.status,
                    content: message.content || existingMessage.content,
                    urlFile: message.urlFile !== undefined ? message.urlFile : existingMessage.urlFile,
                    replyTo: message.replyTo || existingMessage.replyTo,
                    replyMessage: message.replyTo ? this.messages.find(m => m._id === message.replyTo) : existingMessage.replyMessage
                  };
                  this.messages = updatedMessages;
                  this._cdr.markForCheck();
                }
              } else {
                const messageToAdd: Message = {
                  _id: messageId,
                  senderId: senderId,
                  receiverId: inferredReceiverId || receiverId || (isFromOtherUser ? this.currentUserId! : otherUserId),
                  chatId: chatId,
                  content: message.content || '',
                  urlFile: message.urlFile || message.metadata?.urlFile,
                  timestamp: message.timestamp || new Date().toISOString(),
                  type: message.type || 'text' as any,
                  status: message.status || (isFromCurrentUser ? 'sent' as any : 'delivered' as any),
                  isRead: message.isRead || false,
                  isEdited: message.isEdited || false,
                  isDeleted: message.isDeleted || false,
                  updatedAt: message.updatedAt || message.timestamp || new Date().toISOString(),
                  replyTo: message.replyTo,
                  replyMessage: message.replyTo ? this.messages.find(m => m._id === message.replyTo) : undefined
                };
                this.messages = [...this.messages, messageToAdd];
                this._cdr.markForCheck();
              }
            }

            const conversationIndex = this.conversations.findIndex(c => c.userId === otherUserId);

            if (conversationIndex !== -1) {
              const conversation = this.conversations[conversationIndex];
              const isSelected = otherUserId === this.selectedUserId;
              const shouldIncrementUnread = isToCurrentUser && isFromOtherUser && !isSelected;
              
              const updatedConversation: Conversation = {
                ...conversation,
                lastMessage: message.content || conversation.lastMessage || '',
                lastMessageDate: message.timestamp || conversation.lastMessageDate || new Date().toISOString(),
                lastMessageType: message.type || conversation.lastMessageType,
                unreadCount: shouldIncrementUnread
                  ? (conversation.unreadCount || 0) + 1
                  : isFromCurrentUser
                  ? 0
                  : conversation.unreadCount || 0
              };

              this.conversations[conversationIndex] = updatedConversation;
              this.sortConversationsByDate();
              this._cdr.markForCheck();
            } else if (isToCurrentUser && isFromOtherUser) {
              const messageToAdd: Message = {
                _id: messageId,
                senderId: senderId,
                receiverId: inferredReceiverId || receiverId || this.currentUserId!,
                chatId: chatId,
                content: message.content || '',
                urlFile: message.urlFile || message.metadata?.urlFile,
                timestamp: message.timestamp || new Date().toISOString(),
                type: message.type || 'text' as any,
                status: message.status || 'delivered' as any,
                isRead: message.isRead || false,
                isEdited: message.isEdited || false,
                isDeleted: message.isDeleted || false,
                updatedAt: message.updatedAt || message.timestamp || new Date().toISOString(),
                replyTo: message.replyTo,
                replyMessage: message.replyTo ? this.messages.find(m => m._id === message.replyTo) : undefined
              };
              this.addNewConversation(otherUserId, messageToAdd, true);
            } else if (isFromCurrentUser) {
              const messageToAdd: Message = {
                _id: messageId,
                senderId: senderId,
                receiverId: inferredReceiverId || receiverId || otherUserId,
                chatId: chatId,
                content: message.content || '',
                urlFile: message.urlFile || message.metadata?.urlFile,
                timestamp: message.timestamp || new Date().toISOString(),
                type: message.type || 'text' as any,
                status: message.status || 'sent' as any,
                isRead: message.isRead || false,
                isEdited: message.isEdited || false,
                isDeleted: message.isDeleted || false,
                updatedAt: message.updatedAt || message.timestamp || new Date().toISOString(),
                replyTo: message.replyTo,
                replyMessage: message.replyTo ? this.messages.find(m => m._id === message.replyTo) : undefined
              };
              this.addNewConversation(otherUserId, messageToAdd, false);
            }
          });
        },
        error: (error) => {
          this._logService.log(
            LevelLogEnum.ERROR,
            'MessagesComponent',
            'Error in socket listener',
            { error: String(error) }
          );
        }
      });
  }

  private addNewConversation(userId: string, message: Message, isFromOtherUser: boolean = true) {
    const newConversation: Conversation = {
      userId: userId,
      lastMessage: message.content,
      lastMessageDate: message.timestamp,
      lastMessageType: message.type,
      unreadCount: isFromOtherUser ? 1 : 0,
      isActive: true
    };

    this.conversations = [newConversation, ...this.conversations];
    this.sortConversationsByDate();
    this.joinChatRoom(userId);
    this._cdr.markForCheck();
  }

  private joinAllChatRooms() {
    if (!this.currentUserId || !this._socketService.isConnected()) {
      return;
    }

    this.conversations.forEach(conversation => {
      if (conversation.userId) {
        this.joinChatRoom(conversation.userId);
      }
    });
  }

  private joinChatRoom(otherUserId: string) {
    if (!this.currentUserId || !otherUserId || !this._socketService.isConnected()) {
      return;
    }

    const chatId = this._messageService.generateChatId(this.currentUserId, otherUserId);

    this._socketService.emitEvent('joinChat', {
      chatId: chatId,
      userId: this.currentUserId
    });
  }

  private sortConversationsByDate() {
    const sorted = [...this.conversations].sort((a, b) => {
      const dateA = new Date(a.lastMessageDate).getTime();
      const dateB = new Date(b.lastMessageDate).getTime();
      return dateB - dateA;
    });
    
    const hasChanged = sorted.some((conv, index) => conv.userId !== this.conversations[index]?.userId);
    if (hasChanged) {
      this.conversations = sorted;
    }
  }

  trackByConversationId(index: number, conversation: Conversation): string {
    return conversation.userId;
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  loadConversations() {
    this.isLoadingConversations = true;
    this.error = null;
    this._cdr.markForCheck();

    this._messageService.getConversations(this.page, this.pageSize).pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: (response: PaginatedResponse<Conversation>) => {
        // Filter out conversations with invalid userId (deleted users)
        const validConversations = (response.conversations || []).filter(conv => {
          if (!conv.userId) {
            this._logService.log(
              LevelLogEnum.WARN,
              'MessagesComponent',
              'Filtered out conversation with undefined userId',
              { conversation: conv }
            );
            return false;
          }
          return true;
        });
        
        this.conversations = validConversations;
        this.totalPages = response.totalPages;
        this.isLoadingConversations = false;
        this.joinAllChatRooms();
        this._cdr.markForCheck();
      },
      error: (error: any) => {
        this.isLoadingConversations = false;
        if (error.status === 404) {
          this.error = 'El servicio de mensajes no está disponible';
        } else {
          this.error = 'Error al cargar conversaciones';
        }
        this._logService.log(
          LevelLogEnum.ERROR,
          'MessagesComponent',
          'Error loading conversations',
          { error: String(error), status: error.status, url: error.url }
        );
        this._cdr.markForCheck();
      }
    });
  }

  loadMessages(userId: string) {
    if (!userId) {
      this.messages = [];
      this.messagesTotalPages = 1;
      this._cdr.markForCheck();
      return;
    }

    this.isLoadingMessages = true;
    this._cdr.markForCheck();

    this._messageService.getMessagesWithUser(userId, 1, 50, 'DESC').pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: (response: PaginatedResponse<Message>) => {
        if (!response) {
          this.messages = [];
          this.messagesTotalPages = 1;
          this.isLoadingMessages = false;
          this.isInitialLoad = false;
          this._cdr.markForCheck();
          return;
        }

        const totalPages = response.totalPages || 1;
        const messages = response.messages || [];
        this.messagesTotalPages = totalPages;
        
        if (messages.length === 0) {
          this.messages = [];
          this.isLoadingMessages = false;
          this.isInitialLoad = false;
          this._cdr.markForCheck();
          return;
        }

        this.messages = messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        this.isLoadingMessages = false;
        this.isInitialLoad = false;

        if (this.messages.length > 0 && this.messages[0].chatId) {
          this.markMessagesAsRead(this.messages[0].chatId, userId);
        }

        this._cdr.markForCheck();
      },
      error: (error: any) => {
        this.messages = [];
        this.messagesTotalPages = 1;
        this.isLoadingMessages = false;
        this.isInitialLoad = false;
        this._logService.log(
          LevelLogEnum.ERROR,
          'MessagesComponent',
          'Error loading messages',
          { error: String(error), userId }
        );
        this._cdr.markForCheck();
      }
    });
  }

  selectConversation(conversation: Conversation) {
    // Validate that conversation has a valid userId
    if (!conversation.userId) {
      this._logService.log(
        LevelLogEnum.WARN,
        'MessagesComponent',
        'Cannot select conversation without userId',
        { conversation }
      );
      return;
    }

    if (this.selectedUserId === conversation.userId) {
      return;
    }

    const conversationIndex = this.conversations.findIndex(c => c.userId === conversation.userId);
    if (conversationIndex !== -1 && this.conversations[conversationIndex].unreadCount > 0) {
      this.conversations[conversationIndex] = {
        ...this.conversations[conversationIndex],
        unreadCount: 0
      };
      this._cdr.markForCheck();
    }

    this.selectedUserId = conversation.userId;
    this.messagesTotalPages = 1;
    const wasInitialLoad = this.isInitialLoad;
    this.messages = [];
    this.isInitialLoad = wasInitialLoad;
    if (!wasInitialLoad) {
      this.isLoadingMessages = false;
    }

    this.loadMessages(conversation.userId);
    this.joinAllChatRooms();

    const newUrl = `/messages/${conversation.userId}`;
    this._location.replaceState(newUrl);

    this._cdr.markForCheck();
  }

  markMessagesAsRead(chatId: string, senderId: string) {
    this._messageService.markMessagesAsRead({ chatId, senderId }).pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: () => {
        this.updateConversationUnreadCount(senderId, 0);
      },
      error: (error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'MessagesComponent',
          'Error marking messages as read',
          { error: String(error), chatId, senderId }
        );
      }
    });
  }

  private updateConversationUnreadCount(userId: string, unreadCount: number) {
    const conversationIndex = this.conversations.findIndex(c => c.userId === userId);
    if (conversationIndex !== -1) {
      const conversation = this.conversations[conversationIndex];
      this.conversations[conversationIndex] = {
        ...conversation,
        unreadCount
      };
      this._cdr.markForCheck();
    }
  }

  private updateConversationLastMessage(userId: string, lastMessage: string, lastMessageDate: string, lastMessageType?: MessageType) {
    const conversationIndex = this.conversations.findIndex(c => c.userId === userId);
    if (conversationIndex !== -1) {
      const conversation = this.conversations[conversationIndex];
      this.conversations[conversationIndex] = {
        ...conversation,
        lastMessage,
        lastMessageDate,
        lastMessageType: lastMessageType || conversation.lastMessageType
      };
      this.sortConversationsByDate();
      this._cdr.markForCheck();
    }
  }

  onMessageSent(newMessage?: Message) {
    if (this.selectedUserId && newMessage) {
      const isTempMessage = newMessage._id?.startsWith('temp_');
      const isErrorMessage = newMessage._id?.startsWith('error_');
      const existingMessage = this.messages.find(m => m._id === newMessage._id);
      const existingTempIndex = isTempMessage ? -1 : this.messages.findIndex(m => m._id?.startsWith('temp_') && 
        m.senderId === newMessage.senderId && 
        m.receiverId === newMessage.receiverId &&
        Math.abs(new Date(m.timestamp).getTime() - new Date(newMessage.timestamp).getTime()) < 5000);
      
      if (isErrorMessage) {
        const tempId = newMessage._id.replace('error_', 'temp_');
        const errorIndex = this.messages.findIndex(m => m._id === tempId);
        if (errorIndex !== -1) {
          this.messages = this.messages.filter((_, index) => index !== errorIndex);
          this._cdr.markForCheck();
        }
        return;
      }
      
      if (existingTempIndex !== -1) {
        this.messages[existingTempIndex] = newMessage;
        this._cdr.markForCheck();
      } else if (!existingMessage) {
        this.messages = [...this.messages, newMessage];
        this._cdr.markForCheck();
      }
      
      if (!isTempMessage) {
        this.updateConversationLastMessage(
          this.selectedUserId,
          newMessage.content,
          newMessage.timestamp,
          newMessage.type
        );
      }
    }
  }

  loadMoreConversations() {
    if (this.page < this.totalPages && !this.isLoadingConversations) {
      this.page++;
      this._messageService.getConversations(this.page, this.pageSize).pipe(takeUntil(this.unsubscribe$)).subscribe({
        next: (response: PaginatedResponse<Conversation>) => {
          // Filter out conversations with invalid userId (deleted users)
          const validNewConversations = (response.conversations || []).filter(conv => {
            if (!conv.userId) {
              this._logService.log(
                LevelLogEnum.WARN,
                'MessagesComponent',
                'Filtered out conversation with undefined userId in pagination',
                { conversation: conv }
              );
              return false;
            }
            return true;
          });
          
          this.conversations = [...this.conversations, ...validNewConversations];
          this.totalPages = response.totalPages;
          
          validNewConversations.forEach(conversation => {
            if (conversation.userId) {
              this.joinChatRoom(conversation.userId);
            }
          });
          
          this._cdr.markForCheck();
        },
        error: (error: any) => {
          this._logService.log(
            LevelLogEnum.ERROR,
            'MessagesComponent',
            'Error loading more conversations',
            { error: String(error) }
          );
        }
      });
    }
  }

  onBackClicked() {
    this.selectedUserId = null;
    this._location.replaceState('/messages');
    this._cdr.markForCheck();
  }
}

