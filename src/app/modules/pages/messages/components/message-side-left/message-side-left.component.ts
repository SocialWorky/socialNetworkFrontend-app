import { Component, OnInit, ChangeDetectorRef, Output, EventEmitter, OnDestroy } from '@angular/core';
import { Location } from '@angular/common';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { AuthService } from '@auth/services/auth.service';
import { User } from '@shared/interfaces/user.interface';
import { UserService } from '@shared/services/users.service';
import { MessageService } from '../../services/message.service';
import { ActivatedRoute, Router } from '@angular/router';
import { NotificationMessageChatService } from '@shared/services/notifications/notificationMessageChat.service';
import { Message } from '../../interfaces/message.interface';
import { DeviceDetectionService } from '@shared/services/DeviceDetection.service';
import { NotificationService } from '@shared/services/notifications/notification.service';
import { GlobalEventService } from '@shared/services/globalEventService.service';

@Component({
  selector: 'worky-message-side-left',
  templateUrl: './message-side-left.component.html',
  styleUrls: ['./message-side-left.component.scss'],
})
export class MessageSideLeftComponent implements OnInit, OnDestroy {
  @Output() userIdSelected = new EventEmitter<string>();

  users: Array<{ user: User, lastMessage: string, createAt: Date, unreadMessagesCount: number }> = [];

  currentUserId: string = '';

  userIdMessage: string = '';

  unreadMessagesCount = 0;

  currentUser = this._authService.getDecodedToken()!;

  loadUsers = true;

  get isMobile(): boolean {
    return this._deviceDetectionService.isMobile();
  }

  private unsubscribe$ = new Subject<void>();

  constructor(
    private userService: UserService,
    private _authService: AuthService,
    private _cdr: ChangeDetectorRef,
    private _activatedRoute: ActivatedRoute,
    private _messageService: MessageService,
    private _notificationMessageChatService: NotificationMessageChatService,
    private _deviceDetectionService: DeviceDetectionService,
    private _router: Router,
    private _location: Location,
    private _notificationService: NotificationService,
    private _globalEventService: GlobalEventService
  ) {
    this.currentUserId = this._authService.getDecodedToken()!.id;
    this._cdr.markForCheck();
  }

  async ngOnInit(): Promise<void> {
    this.userIdMessage = this._activatedRoute.snapshot.paramMap.get('userIdMessages') || '';
    this.currentUserId = this._authService.getDecodedToken()!.id;

    this._notificationMessageChatService.notificationMessageChat$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (message: any) => {
          if (message.senderId === this.currentUserId || message.receiverId === this.currentUserId) {
            this.updateUserMessage(message);
          }
        }
      });

    this._notificationService.notification$.pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: (data: any) => {
        if (data && data[0]?.chatId) {
          const userIdToUpdate = data[0].senderId === this.currentUserId ? data[0].receiverId : data[0].senderId;
          this.loadUnreadMessagesCount(data[0].chatId, userIdToUpdate);
          this._cdr.markForCheck();
        }
      }
    });

    this.getUserMessages();
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  selectUser(userId: string) {
    if (this.isMobile) {
      this._router.navigate(['/messages/', userId]);
    } else {
      const urlWithoutUserId = this._router.url.split('/').slice(0, 2).join('/');
      this._location.replaceState(urlWithoutUserId);
    }
    this.userIdSelected.emit(userId);
  }

  private getUserMessages() {
    console.log('getUserMessages');
    this._messageService.getUsersWithConversations().pipe(
      takeUntil(this.unsubscribe$)
    ).subscribe({
      next: (userIds: string[]) => {
        if (userIds.length === 0) {
          this.loadUsers = false;
          this._cdr.markForCheck();
          return;
        }
        this.loadUsers = true;

        const userObservables = userIds.map(userId => this.userService.getUserById(userId));
        const messageObservables = userIds.map(userId => this._messageService.getLastConversationWithUser(userId));

        forkJoin(userObservables).pipe(takeUntil(this.unsubscribe$)).subscribe({
          next: (users: User[]) => {
            forkJoin(messageObservables).pipe(takeUntil(this.unsubscribe$)).subscribe({
              next: (messages: Message[]) => {
                this.users = users.map((user, index) => ({
                  user,
                  lastMessage: messages[index].content,
                  createAt: messages[index].timestamp,
                  unreadMessagesCount: 0
                }));

                this.users.sort((a, b) => new Date(b.createAt).getTime() - new Date(a.createAt).getTime());

                this.loadUnreadMessagesCounts(userIds, messages.map(msg => msg.chatId));
                this.loadUsers = false;
                this._cdr.markForCheck();
              },
              error: (e: any) => {
                console.error('Error fetching last messages', e);
              }
            });
          },
          error: (e: any) => {
            console.error('Error fetching users', e);
          }
        });
      },
      error: (e: any) => {
        console.error('Error fetching users with conversations', e);
      }
    });
  }

  private updateUserMessage(message: any) {
    const userIdToUpdate = message.senderId === this.currentUserId ? message.receiverId : message.senderId;
    const userIndex = this.users.findIndex(u => u.user._id === userIdToUpdate);

    if (userIndex !== -1) {
      // Update the last message and unread count
      this._messageService.getLastConversationWithUser(userIdToUpdate).pipe(takeUntil(this.unsubscribe$)).subscribe({
        next: (lastMessage: Message) => {
          this.users[userIndex].lastMessage = lastMessage.content;
          this.users[userIndex].createAt = lastMessage.timestamp;
          this.loadUnreadMessagesCount(lastMessage.chatId, userIdToUpdate);
          
          this.users.sort((a, b) => new Date(b.createAt).getTime() - new Date(a.createAt).getTime());
          
          this._cdr.markForCheck();
        },
        error: (e: any) => {
          console.error('Error fetching last message', e);
        }
      });
    } else {
      // If the user is not in the list, add them
      this.userService.getUserById(userIdToUpdate).pipe(takeUntil(this.unsubscribe$)).subscribe({
        next: (user: User) => {
          this._messageService.getLastConversationWithUser(userIdToUpdate).pipe(takeUntil(this.unsubscribe$)).subscribe({
            next: (lastMessage: Message) => {
              this.users.push({
                user,
                lastMessage: lastMessage.content,
                createAt: lastMessage.timestamp,
                unreadMessagesCount: 0
              });
              this.loadUnreadMessagesCount(lastMessage.chatId, userIdToUpdate);

              this.users.sort((a, b) => new Date(b.createAt).getTime() - new Date(a.createAt).getTime());

              this._cdr.markForCheck();
            },
            error: (e: any) => {
              console.error('Error fetching last message', e);
            }
          });
        },
        error: (e: any) => {
          console.error('Error fetching user', e);
        }
      });
    }
  }

  private loadUnreadMessagesCounts(userIds: string[], chatIds: string[]) {
    const unreadMessagesObservables = userIds.map((userId, index) => this._messageService.getUnreadMessagesCount(chatIds[index], userId));

    forkJoin(unreadMessagesObservables).pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: (unreadCounts: number[]) => {
        unreadCounts.forEach((count, index) => {
          this.users[index].unreadMessagesCount = count;
        });
        this._cdr.markForCheck();
      },
      error: (e: any) => {
        console.error('Error fetching unread messages counts', e);
      }
    });
  }

  private loadUnreadMessagesCount(chatId: string, userId: string) {
    this._messageService.getUnreadMessagesCount(chatId, userId).pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: (unreadMessagesCount: number) => {
        const userIndex = this.users.findIndex(u => u.user._id === userId);
        if (userIndex !== -1) {
          this.users[userIndex].unreadMessagesCount = unreadMessagesCount;
          this._cdr.markForCheck();
        }
      },
      error: (e: any) => {
        console.error('Error fetching unread messages count', e);
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

  formatTimeOrElapsed(date: Date): string {
    const now = new Date();
    const givenDate = new Date(date);

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfGivenDate = new Date(givenDate.getFullYear(), givenDate.getMonth(), givenDate.getDate());

    const timeDifference = now.getTime() - givenDate.getTime();
    const daysDifference = Math.floor((startOfToday.getTime() - startOfGivenDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDifference === 0) {
      return new Intl.DateTimeFormat('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(givenDate);
    }

    if (daysDifference < 30) {
      return `${daysDifference} día${daysDifference > 1 ? 's' : ''} atrás`;
    }

    const monthsDifference = Math.floor(daysDifference / 30);
    return `${monthsDifference} mes${monthsDifference > 1 ? 'es' : ''} atrás`;
  }

  sanitizeHtml(message: string): string {
    return this._globalEventService.sanitizeHtml(message);
  }

}
