import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom, lastValueFrom, Subject, takeUntil } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import * as _ from 'lodash';

import { Token } from '@shared/interfaces/token.interface';
import { AuthService } from '@auth/services/auth.service';
import { UserService } from '@shared/services/users.service';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from '@shared/interfaces/user.interface';
import { WorkyButtonType, WorkyButtonTheme } from '@shared/modules/buttons/models/worky-button-model';
import { Publication, PublicationView } from '@shared/interfaces/publicationView.interface';
import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';
import { PublicationService } from '@shared/services/publication.service';
import { NotificationCommentService } from '@shared/services/notifications/notificationComment.service';
import { FriendsService } from '@shared/services/friends.service';
import { FriendsStatus, UserData } from '@shared/interfaces/friend.interface';
import { ImageUploadModalComponent } from '@shared/modules/image-upload-modal/image-upload-modal.component';
import { FileUploadService } from '@shared/services/file-upload.service';
import { environment } from '@env/environment';
import { GlobalEventService } from '@shared/services/globalEventService.service';
import { ProfileService } from './services/profile.service';
import { ProfileNotificationService } from '@shared/services/notifications/profile-notification.service';
import { EmailNotificationService } from '@shared/services/notifications/email-notification.service';
import { DeviceDetectionService } from '@shared/services/DeviceDetection.service';

@Component({
  selector: 'worky-profiles',
  templateUrl: './profiles.component.html',
  styleUrls: ['./profiles.component.scss'],
})
export class ProfilesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  typePublishing = TypePublishing;
  
  publications: Publication = { publications: [], total: 0 };
  
  page = 1;
  
  pageSize = 10;
  
  WorkyButtonType = WorkyButtonType;
  
  WorkyButtonTheme = WorkyButtonTheme;
  
  paramPublication: boolean = false;
  
  loaderPublications?: boolean = false;
  
  userData: User | undefined;
  
  idUserProfile: string = '';
  
  decodedToken!: Token;
  
  isAuthenticated: boolean = false;
  
  isCurrentUser: boolean = false;
  
  dataUser = this._authService.getDecodedToken();
  
  isFriend: boolean = false;
  
  isFriendPending: { status: boolean; _id: string } = { status: false, _id: '' };
  
  idPendingFriend: string = '';
  
  selectedFiles: File[] = [];
  
  imgCoverDefault = '/assets/img/shared/drag-drop-upload-add-file.webp';
  
  selectedImage: string | undefined;
  
  cropper: Cropper | undefined;
  
  originalMimeType: string | undefined;
  
  isUploading = false;
  
  userReceives!: UserData;
  
  userRequest!: UserData;

  isMobile = this._deviceDetectionService.isMobile();

  constructor(
    public _dialog: MatDialog,
    private _authService: AuthService,
    private _userService: UserService,
    private _cdr: ChangeDetectorRef,
    private _activatedRoute: ActivatedRoute,
    private _publicationService: PublicationService,
    private _notificationCommentService: NotificationCommentService,
    private _friendsService: FriendsService,
    private _fileUploadService: FileUploadService,
    private _globalEventService: GlobalEventService,
    private _profileService: ProfileService,
    private _profileNotificationService: ProfileNotificationService,
    private _emailNotificationService: EmailNotificationService,
    private _router: Router,
    private _deviceDetectionService: DeviceDetectionService
  ) {}

  async ngOnInit(): Promise<void> {
    this.idUserProfile = await this._activatedRoute.snapshot.paramMap.get('profileId') || '';
    this._cdr.markForCheck();

    if (this.idUserProfile === '') {
      this.idUserProfile = this._authService.getDecodedToken()?.id!;
      this._cdr.markForCheck();
    }

    this.getDataProfile();

    this._profileService.validateProfile(this.idUserProfile).pipe(takeUntil(this.destroy$)).subscribe();

    this.getUserFriend();
    
    this.decodedToken = this._authService.getDecodedToken()!;
    this.isCurrentUser = this.idUserProfile === this.decodedToken.id;
    this.loaderPublications = true;

    this._publicationService.publications$.pipe(
      distinctUntilChanged((prev, curr) => _.isEqual(prev, curr)),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (publicationsData: PublicationView[]) => {
        this.publications.publications = publicationsData;
        this._cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error getting publications', error);
      }
    });

    this._profileNotificationService.profileUpdated$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.getDataProfile();
      this._cdr.markForCheck();
    });

    this.loadPublications();
    this.loaderPublications = false;
    this.subscribeToNotificationComment();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadPublications() {
    this.publications = await firstValueFrom(
      this._publicationService.getAllPublications(this.page, this.pageSize, TypePublishing.POSTPROFILE, this.idUserProfile).pipe(takeUntil(this.destroy$))
    );
    this._cdr.detectChanges();
  }

  private async getDataProfile(): Promise<void> {
    this._userService.getUserById(this.idUserProfile).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: User) => {
        this.userData = response;
        this._cdr.markForCheck();
      },
      error: (error) => {
        console.error(error);
      },
    });
  }

  private subscribeToNotificationComment() {
    this._notificationCommentService.notificationComment$.pipe(takeUntil(this.destroy$)).subscribe(async () => {
      this.loadPublications();
    });
  }

  private getUserFriend() {
    this._userService.getUserFriends(this._authService.getDecodedToken()?.id!, this.idUserProfile).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.getUserFriendPending();
      },
      error: (error) => {
        console.error(error);
      },
    });
  }

  private getUserFriendPending(): void {
    this._friendsService.getIsMyFriend(this._authService.getDecodedToken()?.id!, this.idUserProfile).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: FriendsStatus) => {
        this.isFriendPending.status = response?.status === 'pending';
        this.idPendingFriend = response?.id;
        if (response?.status === 'pending') {
          this.userReceives = response?.receiver;
          this.userRequest = response?.requester;
          this.isFriend = false;
          this._cdr.markForCheck();
        } else if (response?.status === 'accepted') {
          this.isFriend = true;
          this._cdr.markForCheck();
        } else if (response === null) {
          this.isFriend = false;
          this._cdr.markForCheck();
        }
      },
      error: (error: any) => {
        console.error(error);
      },
    });
  }

  followMyFriend(_id: string) {
    this._friendsService.requestFriend(_id).pipe(takeUntil(this.destroy$)).subscribe({
      next: async () => {
        this.loadPublications();
        this.getUserFriendPending();
        this._emailNotificationService.sendFriendRequestNotification(_id);
        this._cdr.markForCheck();
      },
      error: (error) => {
        console.error(error);
      }
    });
  }

  cancelFriendship(_id: string) {
    this._friendsService.deleteFriend(_id).pipe(takeUntil(this.destroy$)).subscribe({
      next: async () => {
        this.loadPublications();
        this.getUserFriend();
        this._cdr.markForCheck();
      }
    });
  }

  async acceptFriendship(_id: string) {
    this._friendsService.acceptFriendship(_id).pipe(takeUntil(this.destroy$)).subscribe({
      next: async () => {
        this.getUserFriendPending();
        this.loadPublications();
        this._emailNotificationService.acceptFriendRequestNotification(this.idUserProfile);
        this._cdr.markForCheck();
      }
    });
  }

  async openUploadModalAvatar() {
    const dialogRefAvatar = this._dialog.open(ImageUploadModalComponent, {
      data: {
        maxFiles: 1,
      }
    });

    dialogRefAvatar.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result && result.length > 0) {
        this.selectedFiles = result;
        const file = this.selectedFiles[0];
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.selectedImage = e.target.result;
          this.uploadImgAvatar();
          this._cdr.detectChanges();
        };
        reader.readAsDataURL(file);
      }
    });
  }

  async uploadImgAvatar() {
    this.isUploading = true;
    this._cdr.markForCheck();

    const userId = this._authService.getDecodedToken()?.id!;
    const uploadLocation = 'profile-avatar';
    if (this.selectedImage) {
      const response = await lastValueFrom(
        this._fileUploadService.uploadFile(this.selectedFiles, uploadLocation).pipe(takeUntil(this.destroy$))
      );

      const urlImgUpload = environment.APIFILESERVICE + uploadLocation + '/' + response[0].filename;

      this._userService.userEdit(userId, { avatar: urlImgUpload }).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this._globalEventService.updateProfileImage(urlImgUpload);
          if (this.userData) {
            this.userData.avatar = urlImgUpload;
          }
          setTimeout(() => {
            this.isUploading = false;
            this._cdr.markForCheck();
          }, 1200);
        },
        error: (error) => {
          console.error('Error updating profile', error);
          this.isUploading = false;
          this._cdr.markForCheck();
        }
      });

      await Promise.all(response);

      this.selectedFiles = [];
      this._cdr.markForCheck();
    }
  }

  openWhatsApp() {
    window.open('https://wa.me/' + this.userData?.profile?.whatsapp?.number, '_blank');
  }

  sendMessage(_id: string) {
    this._router.navigate(['/messages/', _id]);
  }
}
