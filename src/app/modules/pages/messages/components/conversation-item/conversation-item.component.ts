import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { Conversation } from '../../interfaces/conversation.interface';
import { MessageType } from '../../interfaces/message.interface';
import { UserService } from '@shared/services/core-apis/users.service';
import { User } from '@shared/interfaces/user.interface';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';

@Component({
  selector: 'worky-conversation-item',
  templateUrl: './conversation-item.component.html',
  styleUrls: ['./conversation-item.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConversationItemComponent implements OnInit, OnDestroy {
  private unsubscribe$ = new Subject<void>();

  @Input() conversation!: Conversation;
  @Input() isSelected = false;
  @Input() currentUserId: string | null = null;

  userInfo: User | null = null;
  isLoadingUser = false;
  MessageType = MessageType;
  private static _userInfoCache = new Map<string, User>();

  constructor(
    private _router: Router,
    private _userService: UserService,
    private _cdr: ChangeDetectorRef,
    private _logService: LogService
  ) {}

  ngOnInit() {
    if (this.conversation.userId) {
      const cachedUser = ConversationItemComponent._userInfoCache.get(this.conversation.userId);
      if (cachedUser) {
        this.userInfo = cachedUser;
        this.isLoadingUser = false;
        this._cdr.markForCheck();
      } else {
        this.loadUserInfo();
      }
    }
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  private loadUserInfo() {
    if (!this.conversation.userId) return;

    this.isLoadingUser = true;
    this._cdr.markForCheck();

    this._userService.getUserById(this.conversation.userId)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (user: User) => {
          this.userInfo = user;
          ConversationItemComponent._userInfoCache.set(this.conversation.userId, user);
          this.isLoadingUser = false;
          this._cdr.markForCheck();
        },
        error: (error: any) => {
          this.isLoadingUser = false;
          this._logService.log(
            LevelLogEnum.ERROR,
            'ConversationItemComponent',
            'Error loading user info',
            { error: String(error), userId: this.conversation.userId }
          );
          this._cdr.markForCheck();
        }
      });
  }

  get userName(): string {
    if (!this.userInfo) return this.conversation.userId || '';
    return `${this.userInfo.name || ''} ${this.userInfo.lastName || ''}`.trim() || this.userInfo.username || this.conversation.userId;
  }

  get userAvatar(): string | null {
    return this.userInfo?.avatar || null;
  }

  get displayLastMessage(): string {
    if (!this.conversation.lastMessage) {
      return '';
    }

    const messageType = this.conversation.lastMessageType || this.detectMessageType(this.conversation.lastMessage);

    if (messageType !== MessageType.TEXT) {
      return '';
    }

    return this.conversation.lastMessage;
  }

  get lastMessageType(): MessageType | null {
    if (!this.conversation.lastMessage) {
      return null;
    }

    return this.conversation.lastMessageType || this.detectMessageType(this.conversation.lastMessage);
  }

  private detectMessageType(content: string): MessageType {
    if (!content) {
      return MessageType.TEXT;
    }

    const lowerContent = content.toLowerCase();
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i;
    const videoExtensions = /\.(mp4|webm|ogg|avi|mov|wmv|flv|mkv)(\?|$)/i;
    const audioExtensions = /\.(mp3|wav|ogg|aac|flac|m4a)(\?|$)/i;
    const gifPattern = /\.gif(\?|$)/i;

    if (gifPattern.test(content) || lowerContent.includes('gif')) {
      return MessageType.IMAGE;
    }

    if (imageExtensions.test(content) || lowerContent.includes('image') || lowerContent.includes('img')) {
      return MessageType.IMAGE;
    }

    if (videoExtensions.test(content) || lowerContent.includes('video')) {
      return MessageType.VIDEO;
    }

    if (audioExtensions.test(content) || lowerContent.includes('audio')) {
      return MessageType.AUDIO;
    }

    if (lowerContent.includes('http') && (lowerContent.includes('file') || lowerContent.includes('download'))) {
      return MessageType.FILE;
    }

    return MessageType.TEXT;
  }

}

