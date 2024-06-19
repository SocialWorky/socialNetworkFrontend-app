import { Component, OnInit, OnDestroy } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject, Subscription, lastValueFrom, takeUntil } from 'rxjs';

import { Token } from '@shared/interfaces/token.interface';
import { AuthService } from '@auth/services/auth.service';
import { EditInfoProfileComponent } from './components/edit-info-profile/edit-info-profile.component';
import { UserService } from '@shared/services/users.service';
import { ActivatedRoute } from '@angular/router';
import { User } from '@shared/interfaces/user.interface';
import { WorkyButtonType, WorkyButtonTheme } from '@shared/modules/buttons/models/worky-button-model';
import { PublicationView } from '@shared/interfaces/publicationView.interface';
import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';
import { PublicationService } from '@shared/services/publication.service';
import { NotificationCommentService } from '@shared/services/notificationComment.service';
import { FriendsService } from '@shared/services/friends.service';
import { FriendsStatus, UserData } from '@shared/interfaces/friend.interface';
import { ImageUploadModalComponent } from '@shared/modules/image-upload-modal/image-upload-modal.component';
import { FileUploadService } from '@shared/services/file-upload.service';
import { environment } from '@env/environment';
import { GlobalEventService } from '@shared/services/globalEventService.service';

@Component({
  selector: 'app-profiles',
  templateUrl: './profiles.component.html',
  styleUrls: ['./profiles.component.scss'],
})
export class ProfilesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  private unsubscribe$ = new Subject<void>();

  typePublishing = TypePublishing;

  publications: PublicationView[] = [];

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

  private profileSubscription!: Subscription;

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
    private _globalEventService: GlobalEventService
  ) {}

  async ngOnInit(): Promise<void> {

    this.idUserProfile = this._activatedRoute.snapshot.paramMap.get('profileId') || '';

    if (this.idUserProfile === '') {
      this.idUserProfile = this._authService.getDecodedToken().id;
    } else {
      this.getUserFriend();
    }

    this.decodedToken = this._authService.getDecodedToken();

    this.isCurrentUser = this.idUserProfile === this.decodedToken.id;

    this.getDataProfile();

    this.loaderPublications = true;

    this.paramPublication = await this.getParamsPublication();
    if (this.paramPublication) return;
    this._publicationService.publications$.pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: async (publicationsData: PublicationView[]) => {
        this.publications = publicationsData;
        this._cdr.markForCheck();
      },
      error: (error) => {
        console.error(error);
      }
    });

    await this._publicationService.getAllPublications(this.page, this.pageSize, TypePublishing.POSTPROFILE, this.idUserProfile);

    this.loaderPublications = false;
    this._cdr.markForCheck();
    this.subscribeToNotificationComment();
  }

  ngOnDestroy(): void {
    if (this.profileSubscription) {
      this.profileSubscription.unsubscribe();
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  abrirFormulario(): void {
    const dialogRef = this._dialog.open(EditInfoProfileComponent, {
      width: '250px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.actualizado) {
        this.getDataProfile();
        this._cdr.markForCheck();
      }
    });
  }

  async getDataProfile(): Promise<void> {

    this.profileSubscription = await this._userService.getUserById(this.idUserProfile).subscribe({
      next: (response: User) => {
        this.userData = response;
        this._cdr.markForCheck();
      },
      error: (error) => {
        console.error(error);
      },
    });
  }

  cambiosGuardadosHandler(): void {
    this.getDataProfile();
    this._cdr.markForCheck();
  }

  async subscribeToNotificationComment() {
    this._notificationCommentService.notificationComment$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(async (data: any) => {
      const newCommentInPublications = await this._publicationService.getAllPublications(this.page, this.pageSize, TypePublishing.POSTPROFILE, this.idUserProfile);
      this._publicationService.updatePublications(newCommentInPublications);
    });
  }

  private async getParamsPublication(): Promise<boolean> {
    let result = false;
    const _idPublication = this._activatedRoute.snapshot.paramMap.get('_idPublication');
    if (_idPublication) {
      try {
        const publication = await lastValueFrom(this._publicationService.getPublicationId(_idPublication));
        if (publication.length) {
          this.loaderPublications = false;
          this.publications = publication;

          this._cdr.markForCheck();
          result = true;
        } else {
          result = false;
        }
      } catch (error) {
        console.error(error);
      }
    }
    return result;
  }

  getUserFriend() {
    this._userService.getUserFriends(this._authService.getDecodedToken().id, this.idUserProfile).subscribe({
      next: (response) => {
        this.getUserFriendPending();
      },
      error: (error) => {
        console.error(error);
      },
    });
  }

  getUserFriendPending(): void {
    this._friendsService.getIsMyFriend(this._authService.getDecodedToken().id, this.idUserProfile).subscribe({
      next: (response: FriendsStatus) => {
        this.isFriendPending.status = response?.status === 'pending';
        this.idPendingFriend = response?.id;
        if ( response?.status === 'pending') {
          this.userReceives = response?.receiver;
          this.userRequest = response?.requester;
          this.isFriend = false;
          this._cdr.markForCheck();
        }
        if (response?.status === 'accepted') {
          this.isFriend = true;
          this._cdr.markForCheck();
        }
        if (response === null) {
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
    this._friendsService.requestFriend(_id).subscribe({
      next: async () => {
        const refreshPublications = await this._publicationService.getAllPublications(1, 10, TypePublishing.POSTPROFILE, this.idUserProfile);
        this._publicationService.updatePublications(refreshPublications);
        this.getUserFriendPending();
        this._cdr.markForCheck();
      },
      error: (error) => {
        console.error(error);
      }
    });
  }

  cancelFriendship(_id: string) {
    this._friendsService.deleteFriend(_id).subscribe({
      next: async (data) => {
        const refreshPublications = await this._publicationService.getAllPublications(1, 10, TypePublishing.POSTPROFILE, this.idUserProfile);
        this._publicationService.updatePublications(refreshPublications);
        this.getUserFriend();
        this._cdr.markForCheck();
      }
    });
    this._cdr.markForCheck();
  }

  async acceptFriendship(_id: string) {
    await this._friendsService.acceptFriendship(_id).subscribe({
      next: async (data) => {
        this.getUserFriendPending();
        const refreshPublications = await this._publicationService.getAllPublications(1, 10, TypePublishing.POSTPROFILE, this.idUserProfile);
        this._publicationService.updatePublications(refreshPublications);
        this._cdr.markForCheck();
      }
    });
  }

  async openUploadModal() {
    const dialogRef = this._dialog.open(ImageUploadModalComponent, {
      data: {
        maxFiles: 1,
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.length > 0) {
        this.selectedFiles = result;
        const file = this.selectedFiles[0];
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.selectedImage = e.target.result;
          this.uploadImg();
          this._cdr.detectChanges();
        };
        reader.readAsDataURL(file);
      }
      
    });
  }

  async uploadImg() {
    this.isUploading = true;
    this._cdr.markForCheck();

    const userId = this._authService.getDecodedToken().id;
    const uploadLocation = 'profile-avatar';
    if (this.selectedImage) {
      const response = await lastValueFrom(
        this._fileUploadService.uploadFile(this.selectedFiles, uploadLocation).pipe(takeUntil(this.unsubscribe$))
      );

      const urlImgUpload = environment.APIFILESERVICE + uploadLocation + '/' + response[0].filename;

      await this._userService.userEdit(userId, {
        avatar: urlImgUpload,
      }).pipe(takeUntil(this.unsubscribe$)).subscribe({
        next: (data) => {
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
}
