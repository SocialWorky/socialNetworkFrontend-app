import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom, lastValueFrom, Subject, takeUntil } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import * as _ from 'lodash';
import { Title } from '@angular/platform-browser';

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
import { ScrollService } from '@shared/services/scroll.service';
import { ConfigService } from '@shared/services/config.service';
import { AxiomService } from '@shared/services/apis/axiom.service';

@Component({
  selector: 'worky-profiles',
  templateUrl: './profiles.component.html',
  styleUrls: ['./profiles.component.scss'],
})
export class ProfilesComponent implements OnInit, OnDestroy {
  typePublishing = TypePublishing;
  
  publications: PublicationView[] = [];
  
  page = 1;
  
  pageSize = 10;
  
  WorkyButtonType = WorkyButtonType;
  
  WorkyButtonTheme = WorkyButtonTheme;
  
  paramPublication: boolean = false;
  
  loaderPublications?: boolean = false;
  
  userData: User | undefined;
  
  idUserProfile: string;
  
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

  showScrollToTopButton = false;

  hasMorePublications = true;

  private destroy$ = new Subject<void>();

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
    private _deviceDetectionService: DeviceDetectionService,
    private _scrollService: ScrollService,
    private _titleService: Title,
    private _configService: ConfigService,
    private _axiomService: AxiomService
  ) {
    this._configService.getConfig().pipe(takeUntil(this.destroy$)).subscribe((configData) => {
      this._titleService.setTitle(configData.settings.title + ' - Profile');
    });
    this.idUserProfile = this._activatedRoute.snapshot.paramMap.get('profileId') || '';
  }

  async ngOnInit(): Promise<void> {
    
    this._cdr.markForCheck();

    if (this.idUserProfile === '') {
      this.idUserProfile = this._authService.getDecodedToken()?.id!;
      this._cdr.markForCheck();
    }

    await this.getDataProfile();

    this._profileService.validateProfile(this.idUserProfile).pipe(takeUntil(this.destroy$)).subscribe();

    this.getUserFriend();
    
    this.decodedToken = this._authService.getDecodedToken()!;
    this.isCurrentUser = this.idUserProfile === this.decodedToken.id;
    this.loaderPublications = true;

    this._profileNotificationService.profileUpdated$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.getDataProfile();
      this._cdr.markForCheck();
    });

    await this.loadPublications();
    this.loadSubscription();
    this.loaderPublications = false;
    this.subscribeToNotificationComment();
    this.scrollSubscription();
  }

  private async loadSubscription() {
    this._publicationService.publications$.pipe(
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (publicationsData: PublicationView[]) => {
        publicationsData = publicationsData.filter(pub => pub.author._id === this.idUserProfile || pub.userReceiving?._id === this.idUserProfile);
        this.updatePublications(publicationsData);
      },
      error: (error) => {
        this._axiomService.sendLog({ error: error });
      }
    });

    this._publicationService.publicationsDeleted$.pipe(
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (publicationsData: PublicationView[]) => {
        this.publications = this.publications.filter(pub => !publicationsData.some(pubDeleted => pubDeleted._id === pub._id));
        this._cdr.markForCheck();
      },
      error: (error) => {
        this._axiomService.sendLog({ error: error });
      }
    });
  }

  private updatePublications(publicationsData: PublicationView[]) {
    publicationsData.forEach(newPub => {
      const index = this.publications.findIndex(pub => pub._id === newPub._id);
      if (index !== -1) {
        const existingPub = this.publications[index];
        if (
          JSON.stringify(existingPub) !== JSON.stringify(newPub) ||
          JSON.stringify(existingPub.comment) !== JSON.stringify(newPub.comment) ||
          JSON.stringify(existingPub.reaction) !== JSON.stringify(newPub.reaction)
        ) {
          this.publications[index] = newPub;
        }
      } else {
        this.publications.push(newPub);
      }
    });

    this.publications.sort((a, b) => {
      if (a.fixed && !b.fixed) return -1;
      if (!a.fixed && b.fixed) return 1;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    this.publications.forEach(pub => {
      if (pub.comment) {
        pub.comment.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    });

    this._cdr.markForCheck();
  }

  private scrollSubscription() {
    this._scrollService.scrollEnd$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((data) => {
      if(data === 'scrollEnd') this.loadPublications();
      if(data === 'showScrollToTopButton') this.showScrollToTopButton = true;
      if(data === 'hideScrollToTopButton') this.showScrollToTopButton = false;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

 private async loadPublications() {
    if (this.loaderPublications || !this.hasMorePublications || !navigator.onLine) return;
    this.loaderPublications = true;
    try {
      const newPublications = await firstValueFrom(this._publicationService.getAllPublications(this.page, this.pageSize, TypePublishing.POSTPROFILE, this.idUserProfile));
      if (newPublications.total === this.publications.length) {
        this.hasMorePublications = false;
      }

      const uniqueNewPublications = newPublications.publications.filter(newPub => 
        !this.publications.some(pub => pub._id === newPub._id)
      );

      this.publications = [...this.publications, ...uniqueNewPublications];
      this.page++;
      this.loaderPublications = false;
      this._cdr.markForCheck();

    } catch (error) {
      this._axiomService.sendLog({ error: error });
      this.loaderPublications = false;
    }
  }


  private async getDataProfile(): Promise<void> {
    this._userService.getUserById(this.idUserProfile).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: User) => {
        this.userData = response;
        this._cdr.markForCheck();
      },
      error: (error) => {
        this._axiomService.sendLog({ error: error });
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
        this._axiomService.sendLog({ error: error });
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
        this._axiomService.sendLog({ error: error });
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
        this._axiomService.sendLog({ error: error });
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
      },
      error: (error) => {
        this._axiomService.sendLog({ error: error });
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
          this._axiomService.sendLog({ error: error });
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

  onScroll(event: any) {
    const threshold = 100;
    const position = event.target.scrollTop + event.target.clientHeight;
    const height = event.target.scrollHeight;

    this.showScrollToTopButton = position > 3500;

    if (position >= height - threshold && !this.loaderPublications && this.hasMorePublications) {
      this.loadPublications();
    }
  }

  scrollToTop() {
    this._scrollService.scrollToTop();
  }
}
