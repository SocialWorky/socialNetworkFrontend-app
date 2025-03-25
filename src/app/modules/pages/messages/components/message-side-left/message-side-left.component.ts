import { Component, OnInit, ChangeDetectorRef, Output, EventEmitter, OnDestroy } from '@angular/core';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { AuthService } from '@auth/services/auth.service';
import { User } from '@shared/interfaces/user.interface';
import { UserService } from '@shared/services/core-apis/users.service';
import { MessageService } from '../../services/message.service';
import { NotificationMessageChatService } from '@shared/services/notifications/notificationMessageChat.service';
import { Message } from '../../interfaces/message.interface';
import { NotificationService } from '@shared/services/notifications/notification.service';
import { MessageStateService } from '../../services/message-state.service';

@Component({
    selector: 'worky-message-side-left',
    templateUrl: './message-side-left.component.html',
    styleUrls: ['./message-side-left.component.scss'],
    standalone: false
})
export class MessageSideLeftComponent implements OnInit, OnDestroy {
  @Output() userIdSelected = new EventEmitter<string>();

  users$!: any;

  usersMessages: any[] = [];

  loadUsers = true;

  private _unsubscribe$ = new Subject<void>();

  constructor(
    private _messageStateService: MessageStateService,
    private _authService: AuthService,
    private _messageService: MessageService,
    private _notificationService: NotificationService,
    private _userService: UserService,
    private _notificationMessageChatService: NotificationMessageChatService,
    private _cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this._authService.isAuthenticated()) return;

    this.users$ = this._messageStateService.usersWithConversations$;

    this.users$.pipe(takeUntil(this._unsubscribe$)).subscribe((users: any) => {
      this.usersMessages = users;
    });

    this.loadUsersWithConversations();

    this._notificationMessageChatService.notificationMessageChat$
      .pipe(takeUntil(this._unsubscribe$))
      .subscribe((message: any) => {
        if (message.senderId === this._authService.getDecodedToken()?.id || message.receiverId === this._authService.getDecodedToken()?.id) {
          this.updateUserMessage(message);
        }
      });

    this._notificationService.notification$.pipe(takeUntil(this._unsubscribe$)).subscribe({
      next: (data: any) => {
        if (data && data[0]?.chatId) {
          const userIdToUpdate = data[0].senderId === this._authService.getDecodedToken()?.id ? data[0].receiverId : data[0].senderId;
          this._userService.getUserById(userIdToUpdate).pipe(takeUntil(this._unsubscribe$)).subscribe((user: User) => {
            if (user) {
              this.loadUnreadMessagesCount(data[0].chatId, data[0].content, user);
            }
          });
        }
      },
    });
  }

  ngOnDestroy(): void {
    this._unsubscribe$.next();
    this._unsubscribe$.complete();
  }

  private loadUsersWithConversations(): void {
    this._messageService.getUsersWithConversations().subscribe({
      next: (userIds: string[]) => {

        if (userIds.length === 0) {
          this.loadUsers = false;
          this._cdr.markForCheck();
          return;
        }

        const userObservables = userIds.map(userId => this._userService.getUserById(userId));
        const messageObservables = userIds.map(userId => this._messageService.getLastConversationWithUser(userId));

        forkJoin([forkJoin(userObservables), forkJoin(messageObservables)]).subscribe({
          next: ([users, messages]: [User[], Message[]]) => {
            const unreadMessagesObservables = users.map((user, index) =>
              this._messageService.getUnreadMessagesCount(messages[index].chatId, user._id)
            );

            forkJoin(unreadMessagesObservables).subscribe({
              next: (unreadCounts: number[]) => {
                const updatedUsers = users.map((user, index) => ({
                  user,
                  lastMessage: messages[index].content,
                  createAt: messages[index].timestamp,
                  unreadMessagesCount: unreadCounts[index],
                }));

                this._messageStateService.updateUsersWithConversations(updatedUsers);
                this.loadUsers = false;
                this._cdr.markForCheck();
              },
              error: (error: any) => console.error('Error fetching unread messages counts', error),
            });
          },
          error: (error: any) => console.error('Error fetching users or messages', error),
        });
      },
      error: (error: any) => console.error('Error fetching users with conversations', error),
    });
  }

  private updateUserMessage(message: any): void {
    const userIdToUpdate = message.senderId === this._authService.getDecodedToken()?.id ? message.receiverId : message.senderId;

    this._messageService.getLastConversationWithUser(userIdToUpdate).subscribe({
      next: (lastMessage: Message) => {

        this._userService.getUserById(userIdToUpdate).pipe(takeUntil(this._unsubscribe$)).subscribe({
          next: (user: User) => {
            this._messageService.getUnreadMessagesCount(lastMessage.chatId, user._id).pipe(takeUntil(this._unsubscribe$)).subscribe({
              next: (unreadMessagesCount: number) => {
                this._messageStateService.addUserOrUpdate(user, lastMessage.content, lastMessage.timestamp, unreadMessagesCount);
              },
              error: (error: any) => console.error('Error fetching unread messages count', error),
            });
          },
          error: (error: any) => console.error('Error fetching user', error),
        });
      },
      error: (error: any) => console.error('Error fetching last message', error),
    });
  }

  private loadUnreadMessagesCount(chatId: string, lastMessage: string, user: User): void {
    this._messageService.getUnreadMessagesCount(chatId, user._id).pipe(takeUntil(this._unsubscribe$)).subscribe({
      next: (unreadMessagesCount: number) => {
        this._messageStateService.addUserOrUpdate(user, lastMessage, new Date(), unreadMessagesCount);
      },
    });
  }
}
