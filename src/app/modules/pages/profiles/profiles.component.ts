import { Component, OnInit, OnDestroy, ChangeDetectorRef, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom, lastValueFrom, of, Subject, takeUntil } from 'rxjs';
import { catchError, distinctUntilChanged, filter, switchMap } from 'rxjs/operators';
import * as _ from 'lodash';
import { Title } from '@angular/platform-browser';

import { Token } from '@shared/interfaces/token.interface';
import { AuthService } from '@auth/services/auth.service';
import { UserService } from '@shared/services/core-apis/users.service';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from '@shared/interfaces/user.interface';
import { WorkyButtonType, WorkyButtonTheme } from '@shared/modules/buttons/models/worky-button-model';
import { Publication, PublicationView } from '@shared/interfaces/publicationView.interface';
import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';
import { PublicationService } from '@shared/services/core-apis/publication.service';
import { NotificationCommentService } from '@shared/services/notifications/notificationComment.service';
import { FriendsService } from '@shared/services/core-apis/friends.service';
import { FriendsStatus, UserData } from '@shared/interfaces/friend.interface';
import { ImageUploadModalComponent } from '@shared/modules/image-upload-modal/image-upload-modal.component';
import { FileUploadService } from '@shared/services/core-apis/file-upload.service';
import { environment } from '@env/environment';
import { GlobalEventService } from '@shared/services/globalEventService.service';
import { ProfileService } from './services/profile.service';
import { ProfileNotificationService } from '@shared/services/notifications/profile-notification.service';
import { EmailNotificationService } from '@shared/services/notifications/email-notification.service';
import { DeviceDetectionService } from '@shared/services/DeviceDetection.service';
import { ScrollService } from '@shared/services/scroll.service';
import { ConfigService } from '@shared/services/core-apis/config.service';
import { NotificationPublicationService } from '@shared/services/notifications/notificationPublication.service';
import { NotificationNewPublication } from '@shared/interfaces/notificationPublication.interface';

@Component({
    selector: 'worky-profiles',
    templateUrl: './profiles.component.html',
    styleUrls: ['./profiles.component.scss'],
    standalone: false
})
export class ProfilesComponent implements OnInit, OnDestroy {
  typePublishing = TypePublishing;

  publicationsProfile = signal<PublicationView[]>([]);

  page = 1;

  pageSize = 10;

  WorkyButtonType = WorkyButtonType;

  WorkyButtonTheme = WorkyButtonTheme;

  paramPublication: boolean = false;

  loaderPublications: boolean = false;

  userData: User | undefined;

  idUserProfile: string;

  decodedToken!: Token;

  isAuthenticated: boolean = false;

  isCurrentUser: boolean = false;

  dataUser: Token | null = null;

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
    private _notificationPublicationService: NotificationPublicationService
  ) {
    this._configService.getConfig().pipe(takeUntil(this.destroy$)).subscribe((configData) => {
      this._titleService.setTitle(configData.settings.title + ' - Profile');
    });
    this.idUserProfile = this._activatedRoute.snapshot.paramMap.get('profileId') || '';
  }

  async ngOnInit(): Promise<void> {
    this._authService.isAuthenticated();
    if (this.idUserProfile === '') {
      this.idUserProfile = this._authService.getDecodedToken()?.id!;
      this._cdr.markForCheck();
    }

    await this.getDataProfile();

    this._profileService.validateProfile(this.idUserProfile).pipe(takeUntil(this.destroy$)).subscribe();

    this.getUserFriend();

    this.decodedToken = this._authService.getDecodedToken()!;
    this.isCurrentUser = this.idUserProfile === this.decodedToken.id;

    this.subscribeToNotificationNewPublication();
    this.subscribeToNotificationDeletePublication();
    this.subscribeToNotificationUpdatePublication();
    this.subscribeToNotificationComment();
    this.scrollSubscription();

    this.publicationsProfile.set([]);
    await this.loadPublications();
    this.loaderPublications = false;

    this._profileNotificationService.profileUpdated$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.getDataProfile();
      this._cdr.markForCheck();
    });


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

    if (this.loaderPublications || !this.hasMorePublications) return;
    this.loaderPublications = true;
    try {

      const newPublications = await firstValueFrom(this._publicationService.getAllPublications(this.page, this.pageSize, TypePublishing.POSTPROFILE, this.idUserProfile));

      this.publicationsProfile.update((current: PublicationView[]) => [...current, ...newPublications.publications]);

      if (this.publicationsProfile().length >= newPublications.total) {
        this.hasMorePublications = false;
      }

      this.page++;
      this.loaderPublications = false;
      this._cdr.markForCheck();

    } catch (error) {
      console.error('Error al cargar las publicaciones:', error);
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
        console.error('Error al obtener los datos del perfil:', error);
      },
    });
  }

  private async subscribeToNotificationNewPublication() {
    this._notificationPublicationService.notificationNewPublication$
      .pipe(
        takeUntil(this.destroy$),
        filter((notifications: NotificationNewPublication[]) => !!notifications?.[0]?.publications?._id)
      )
      .subscribe({
        next: async (notifications: NotificationNewPublication[]) => {
          const notification = notifications[0];
          const publicationsCurrent = this.publicationsProfile();

          this._publicationService.getPublicationId(notification.publications._id)
            .pipe(
              takeUntil(this.destroy$),
              filter((publication: PublicationView[]) => {
                return !!publication &&
                       publication.length > 0 &&
                       publication[0].author._id === this.idUserProfile ||
                       publication[0].userReceiving?._id === this.idUserProfile;
              })
            )
            .subscribe({
              next: (publication: PublicationView[]) => {
                const newPublication = publication[0];

                const fixedPublications = publicationsCurrent.filter(pub => pub.fixed);
                const nonFixedPublications = publicationsCurrent.filter(pub => !pub.fixed);

                const updatedPublications = [
                  ...fixedPublications,
                  newPublication,
                  ...nonFixedPublications
                ];

                this.publicationsProfile.set(updatedPublications);
                this._cdr.markForCheck();
              },
              error: (error) => {
               console.error('Error al obtener la publicación:', error);
              }
            });
        },
        error: (error) => {
          console.error('Error en suscripción de notificaciones de nuevas publicaciones', error);
        }
      });
  }

  private async subscribeToNotificationDeletePublication() {
    this._notificationPublicationService.notificationDeletePublication$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (notifications: {_id: string}[]) => {
          const notification = notifications[0];
          if (notification?._id) {
            const publicationsCurrent = this.publicationsProfile();
            const index = publicationsCurrent.findIndex(pub => pub._id === notification._id);
            if (index !== -1) {
              publicationsCurrent.splice(index, 1);
              this.publicationsProfile.set(publicationsCurrent);
              this._cdr.markForCheck();
            }
          }
        },
        error: (error) => {
          console.error('Error en suscripción de notificaciones de eliminar publicaciones', error);
        }
      });
  }

  private async subscribeToNotificationUpdatePublication() {
    this._notificationPublicationService.notificationUpdatePublication$
      .pipe(
        takeUntil(this.destroy$),
        filter((data: PublicationView[]) => !!data?.[0]?._id),
        switchMap((data: PublicationView[]) => {
          const notification = data[0];
          return this._publicationService.getPublicationId(notification._id).pipe(
            catchError((error) => {
              console.error('Error al obtener la publicación:', error);
              return of([]);
            })
          );
        }),
        filter((publication: PublicationView[]) => publication.length > 0)
      )
      .subscribe({
        next: (publication: PublicationView[]) => {

          if (publication[0].author._id !== this.userData?._id) return;

          const updatedPublication = publication[0];
          const publicationsCurrent = this.publicationsProfile();

          const fixedPublications = publicationsCurrent.filter(pub => pub.fixed && pub._id !== updatedPublication._id);
          const nonFixedPublications = publicationsCurrent.filter(pub => !pub.fixed && pub._id !== updatedPublication._id);

          let updatedPublications: PublicationView[];

          if (updatedPublication.fixed) {
            updatedPublications = [
              updatedPublication,
              ...fixedPublications,
              ...nonFixedPublications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            ];
          } else {
            updatedPublications = [
              ...fixedPublications,
              ...nonFixedPublications.concat(updatedPublication).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            ];
          }

          this.publicationsProfile.set(updatedPublications);
          this._cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error en suscripción de notificaciones de actualizar publicaciones', error);
        }
      });
  }

  private async subscribeToNotificationComment() {
    this._notificationCommentService.notificationComment$
     .pipe(takeUntil(this.destroy$))
     .subscribe({
      next: async (data: any) => {
        if (data.postId) {
          const publicationsCurrent = this.publicationsProfile();
          this._publicationService.getPublicationId(data.postId).pipe(takeUntil(this.destroy$)).subscribe({
            next: (publication: PublicationView[]) => {
              const index = publicationsCurrent.findIndex(pub => pub._id === publication[0]._id);
              if (index !== -1) {
                publicationsCurrent[index] = publication[0];
                this.publicationsProfile.set(publicationsCurrent);
                this._cdr.markForCheck();
              }
            },
          });
        }
      },
      error: (error) => {
       console.error('Error en suscripción de notificaciones de comentarios', error);
      }
    });
  }


  private getUserFriend() {
    this._userService.getUserFriends(this._authService.getDecodedToken()?.id!, this.idUserProfile).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.getUserFriendPending();
      },
      error: (error) => {
        console.error('Error al obtener los amigos:', error);
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
        console.error('Error al obtener el estado de la solicitud de amistad:', error);
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
        console.error('Error al enviar la solicitud de amistad:', error);
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
        console.error('Error al aceptar la solicitud de amistad:', error);
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
          console.error('Error al actualizar la imagen de perfil:', error);
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
