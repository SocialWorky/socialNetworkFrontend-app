import { Component, OnInit, ChangeDetectorRef, Output, EventEmitter, OnDestroy } from '@angular/core';
import { AuthService } from '@auth/services/auth.service';
import { User } from '@shared/interfaces/user.interface';
import { UserService } from '@shared/services/users.service';
import { MessageService } from '../../services/message.service';
import { ActivatedRoute, Router } from '@angular/router';
import { NotificationMessageChatService } from '@shared/services/notifications/notificationMessageChat.service';
import { Subject, takeUntil } from 'rxjs';
import { Message } from '../../interfaces/message.interface';
import { DeviceDetectionService } from '@shared/services/DeviceDetection.service';

@Component({
  selector: 'worky-message-side-left',
  templateUrl: './message-side-left.component.html',
  styleUrls: ['./message-side-left.component.scss'],
})
export class MessageSideLeftComponent implements OnInit, OnDestroy {
  @Output() userIdSelected = new EventEmitter<string>();

  users: Array<{ user: User, lastMessage: string, createAt: Date }> = [];

  currentUserId: string = '';

  userIdMessage: string = '';

  currentUser = this._authService.getDecodedToken()!;

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
    private _router: Router
  ) { }

  async ngOnInit(): Promise<void> {
    this.userIdMessage = await this._activatedRoute.snapshot.paramMap.get('userIdMessages') || '';

    this.currentUserId = this._authService.getDecodedToken()!.id;

    this._cdr.markForCheck();

    this._notificationMessageChatService.notificationMessageChat$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (message: any) => {
          if (message.senderId === this.currentUserId) {
            this.getUserMessages();
            this._cdr.markForCheck();
          }
          if (message.receiverId === this.currentUserId) {
            this.getUserMessages();
            this._cdr.markForCheck();
          }
        }
      });
    if(!this.currentUserId) return
    await this.getUserMessages();
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  selectUser(userId: string) {
    if (this.isMobile) {
      this._router.navigate(['/messages/', userId]);
    }
    this.userIdSelected.emit(userId);
  }
  private async getUserMessages() {
    this.users = [];
    await this._messageService.getUsersWithConversations().pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: (response: string[]) => {
        response.forEach((userId: string) => {
          this.userService.getUserById(userId).pipe(takeUntil(this.unsubscribe$)).subscribe({
            next: (user: User) => {
              this._messageService.getLastConversationWithUser(userId).pipe(takeUntil(this.unsubscribe$)).subscribe({
                next: (message: Message) => {
                  this.users.push({ user, lastMessage: message.content, createAt: message.timestamp });
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
        });
      },
      error: (e: any) => {
        console.error('Error fetching users', e);
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

}
