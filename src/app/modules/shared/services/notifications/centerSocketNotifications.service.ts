import { Injectable } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

import { User } from '@shared/interfaces/user.interface';
import { NotificationType } from '@shared/modules/notifications-panel/enums/notificationsType.enum';
import { NotificationCenterService } from '@shared/services/core-apis/notificationCenter.service';
import { AuthService } from '@auth/services/auth.service';
import { NotificationService } from './notification.service';
import { PublicationView } from '@shared/interfaces/publicationView.interface';
import { CustomReaction } from '@shared/interfaces/reactions.interface';
import { Token } from '@shared/interfaces/token.interface';

@Injectable({
  providedIn: 'root'
})

export class CenterSocketNotificationsService {

  userToken: Token | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private _notificationCenterService: NotificationCenterService,
    private _authService: AuthService,
    private _notificationService: NotificationService
  ) { 
    if(!this._authService.isAuthenticated()) return;
    this.userToken = this._authService.getDecodedToken();
  }

  senFriendRequestNotification(user: User) {

    if (!this.userToken) return;

    const dataNotification = {
      sendUserId: this.userToken.id,
      sendUserName: this.userToken.name,
      sendUserAvatar: this.userToken.avatar,
    };

    this._notificationCenterService.createNotification({
      userId: user._id,
      type: NotificationType.FRIEND_REQUEST,
      content: 'Has recibido una solicitud de amistad',
      link: `/profile/${this.userToken.id}`,
      additionalData: JSON.stringify(dataNotification),
    }).pipe(takeUntil(this.destroy$)).subscribe();

    this._notificationService.sendNotification();

  }

  acceptFriendRequestNotification(user: User) {

    if (!this.userToken) return;
    
    const dataNotification = {
      acceptUserId: this.userToken.id,
      acceptUserName: this.userToken.name,
      acceptUserAvatar: this.userToken.avatar,
    };

    this._notificationCenterService.createNotification({
      userId: user._id,
      type: NotificationType.FRIEND_ACCEPTED,
      content: 'Solicitud de amistad aceptada',
      link: `/profile/${this.userToken.id}`,
      additionalData: JSON.stringify(dataNotification),
    }).pipe(takeUntil(this.destroy$)).subscribe();

    this._notificationService.sendNotification();

  }

  reactionInPublicationNotification(publication: PublicationView, reaction: CustomReaction) {

    if (!this.userToken) return;

    const dataNotification = {
      name: reaction.name,
      emoji: reaction.emoji,
      _id: reaction._id,
      userIdReaction: this.userToken?.id,
      userNameReaction: this.userToken?.name,
      userAvatarReaction: this.userToken?.avatar,
    };

    this._notificationCenterService.createNotification({
      userId: publication?.author._id!,
      type: NotificationType.LIKE,
      content: 'Han reaccionado a tu publicación',
      link: `/publication/${publication?._id}`,
      additionalData: JSON.stringify(dataNotification),
    }).pipe(takeUntil(this.destroy$)).subscribe();

    this._notificationService.sendNotification(publication);

  }

}
