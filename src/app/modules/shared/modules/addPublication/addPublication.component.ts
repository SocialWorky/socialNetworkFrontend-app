import { ChangeDetectorRef, Component, ElementRef, Input, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LoadingController } from '@ionic/angular';
import { Subject, Subscription, lastValueFrom, takeUntil } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';

import { WorkyButtonType, WorkyButtonTheme } from '@shared/modules/buttons/models/worky-button-model';
import { AuthService } from '@auth/services/auth.service';
import { PublicationService } from '@shared/services/publication.service';
import { CommentService } from '@shared/services/comment.service';
import { translations } from '@translations/translations';
import { TypePublishing, TypePrivacy } from './enum/addPublication.enum';
import { Token } from '@shared/interfaces/token.interface';
import { AlertService } from '@shared/services/alert.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { CreateComment } from '@shared/interfaces/addComment.interface';
import { NotificationCommentService } from '@shared/services/notifications/notificationComment.service';
import { LocationSearchComponent } from '../location-search/location-search.component';
import { ExtraData } from '@shared/modules/addPublication/interfaces/createPost.interface';
import { ImageUploadModalComponent } from '../image-upload-modal/image-upload-modal.component';
import { FileUploadService } from '@shared/services/file-upload.service';
import { MediaFileUpload } from '@shared/interfaces/publicationView.interface';
import { UserService } from '@shared/services/users.service';
import { GlobalEventService } from '@shared/services/globalEventService.service';
import { User } from '@shared/interfaces/user.interface';

@Component({
  selector: 'worky-add-publication',
  templateUrl: './addPublication.component.html',
  styleUrls: ['./addPublication.component.scss'],
})
export class AddPublicationComponent implements OnInit, OnDestroy {
  WorkyButtonType = WorkyButtonType;
  
  WorkyButtonTheme = WorkyButtonTheme;

  user: User = {} as User;
  
  nameGeoLocation: string = '';

  dataGeoLocation: string = '';

  showEmojiMenu = false;

  privacyFront: string = '';

  previews: { url: string, type: string }[] = [];

  selectedFiles: File[] = [];

  privacy: TypePrivacy = TypePrivacy.PUBLIC;

  typePrivacy = TypePrivacy;

  decodedToken!: Token;

  isAuthenticated: boolean = false;

  typePublishing = TypePublishing;

  profileImageUrl: null | string = null;

  public myForm: FormGroup = this._fb.group({
    content: ['', [Validators.required, Validators.minLength(1)]],
    privacy: [''],
    authorId: [''],
    extraData: [''],
    userReceivingId: [''],
  });

  get userToken(): string {
    return this.decodedToken.id;
  }

  private unsubscribe$ = new Subject<void>();

  private subscription: Subscription | undefined;

  @Input() type: TypePublishing | undefined;

  @Input() idPublication?: string;

  @Input() indexPublication?: number;

  @Input() idUserProfile?: string;

  @ViewChild('postText') postTextRef!: ElementRef;

  constructor(
    private _fb: FormBuilder,
    private _authService: AuthService,
    private _publicationService: PublicationService,
    private _commentService: CommentService,
    private _alertService: AlertService,
    private _loadingCtrl: LoadingController,
    private _notificationCommentService: NotificationCommentService,
    private _dialog: MatDialog,
    private _cdr: ChangeDetectorRef,
    private _fileUploadService: FileUploadService,
    private _userService: UserService,
    private _globalEventService: GlobalEventService,
  ) {
    this.isAuthenticated = this._authService.isAuthenticated();
    if (this.isAuthenticated) {
      this.decodedToken = this._authService.getDecodedToken();
    }
  }

  ngOnInit() {
    this.postPrivacy(TypePrivacy.PUBLIC);
    this.getUser();
    this.subscription = this._globalEventService.profileImage$.pipe(
      takeUntil(this.unsubscribe$)
    ).subscribe(newImageUrl => {

      this.profileImageUrl = newImageUrl;

      if (this.type === TypePublishing.POSTPROFILE) {
        (async () => {
          try {
            const publicationsNew = await this._publicationService.getAllPublications(1, 10, TypePublishing.POSTPROFILE, this.idUserProfile);
            this._publicationService.updatePublications(publicationsNew);
          } catch (error) {
            console.error('Error getting publications', error);
          }
        })();
      }
    });

  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  ngAfterViewInit() {
    this.autoResize();
  }

  async getUser() {
    await this._userService.getUserById(this.decodedToken.id).pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: (response: User) => {
        this.profileImageUrl = response.avatar;
        this.user = response;
        this._cdr.markForCheck();
      },
      error: (error) => {
        console.error(error);
      },
    });
  }

  toggleEmojiMenu() {
    this.showEmojiMenu = !this.showEmojiMenu;
  }

  preventClose(event: Event) {
    event.stopPropagation();
  }

  onEmojiClick(event: any) {
    const selectedEmoji = event.emoji.native;
    const currentContent = this.myForm.get('content')?.value;
    const newContent = currentContent + selectedEmoji;
    this.myForm.get('content')?.setValue(newContent);
    this.showEmojiMenu = false;
  }

  async onSave() {
    this.myForm.controls['authorId'].setValue(this.decodedToken.id);
    this.myForm.controls['privacy'].setValue(this.privacy);

    if (this.type === TypePublishing.POST || this.type === TypePublishing.POSTPROFILE) {
      this.onSavePublication();
    }
    if (this.type === TypePublishing.COMMENT) {
      this.onSaveComment(this.idPublication as string);
    }
  }

  private async onSaveComment(idPublication: string) {
    const loadingComment = await this._loadingCtrl.create({
      message: translations['addPublication.loadingCommentMessage'],
    });

    await loadingComment.present();

    const dataComment: CreateComment = {
      content: this.myForm.controls['content'].value,
      authorId: this.decodedToken.id,
      idPublication: idPublication,
    };

    this._commentService.createComment(dataComment).pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: async (message: any) => {
        try {
          if (this.selectedFiles.length) {
            const response = await lastValueFrom(
              this._fileUploadService.uploadFile(this.selectedFiles, 'comments').pipe(takeUntil(this.unsubscribe$))
            );
            const saveLocation = 'comments/';
            const saveFilePromises = response.map((file: MediaFileUpload) => {
              return lastValueFrom(
                this._fileUploadService.saveUrlFile(
                  saveLocation + file.filename,
                  saveLocation + file.filenameThumbnail,
                  saveLocation + file.filenameCompressed,
                  message.comment._id, TypePublishing.COMMENT).pipe(takeUntil(this.unsubscribe$))
              );
            });

            await Promise.all(saveFilePromises);

            this.selectedFiles = [];
            this.previews = [];
            this._cdr.markForCheck();
          }

          let publicationsNew = [];

          if(this.type === TypePublishing.POSTPROFILE){
            publicationsNew = await this._publicationService.getAllPublications(1, 10, TypePublishing.POSTPROFILE, this.idUserProfile);
            publicationsNew[this.indexPublication!].comment.unshift(message.comment);
            this._publicationService.updatePublications(publicationsNew);
          } else {
            publicationsNew = await this._publicationService.getAllPublications(1, 10);
            publicationsNew[this.indexPublication!].comment.unshift(message.comment);
            this._publicationService.updatePublications(publicationsNew);
          }

          if (message.message === 'Comment created successfully') {
            this.myForm.controls['content'].setValue('');
            this.autoResize();
            this._alertService.showAlert(
              translations['addPublication.alertCreateCommentTitle'],
              translations['addPublication.alertCreateCommentMessage'],
              Alerts.SUCCESS,
              Position.CENTER,
              true,
              true,
              translations['button.ok'],
            );
            this._notificationCommentService.sendNotificationComment({
              commentId: message.comment._id,
              idPublication: idPublication,
              userEmittedId: this.decodedToken.id,
              authorPublicationId: publicationsNew[this.indexPublication!].author._id,
            });
          }
        } catch (error) {
          console.error(error);
        } finally {
          loadingComment.dismiss();
        }
      },
      error: (error) => {
        console.error(error);
        loadingComment.dismiss();
      }
    });
  }

  private async onSavePublication() {
    const loadingPublications = await this._loadingCtrl.create({
      message: translations['addPublication.loadingPublicationMessage'],
    });

    loadingPublications.present();

    const extraData: ExtraData = {
      locations: {
        title: this.nameGeoLocation,
        urlMap: this.dataGeoLocation,
      }
    };

    if (this.nameGeoLocation !== '' || this.dataGeoLocation !== '') {
      this.myForm.controls['extraData'].setValue(JSON.stringify(extraData));
    }

    if (this.type === TypePublishing.POSTPROFILE && this.idUserProfile !== this.decodedToken.id) {
      this.myForm.controls['userReceivingId'].setValue(this.idUserProfile);
      this.myForm.controls['privacy'].setValue(TypePrivacy.FRIENDS);
    }

    this._publicationService.createPost(this.myForm.value).pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: async (message: any) => {
        try {
          if (this.selectedFiles.length) {
            const response = await lastValueFrom(
              this._fileUploadService.uploadFile(this.selectedFiles, 'publications').pipe(takeUntil(this.unsubscribe$))
            );
            const saveFilePromises = response.map((file: MediaFileUpload) => {
              const saveLocation = 'publications/';
              return lastValueFrom(
                this._fileUploadService.saveUrlFile(
                  saveLocation + file.filename,
                  saveLocation + file.filenameThumbnail,
                  saveLocation + file.filenameCompressed,
                  message.publications._id,
                  TypePublishing.POST).pipe(takeUntil(this.unsubscribe$))
              );
            });

            await Promise.all(saveFilePromises);

            this.selectedFiles = [];
            this.previews = [];
            this._cdr.markForCheck();
          }

          if(this.type === TypePublishing.POSTPROFILE){
            const publicationsNew = await this._publicationService.getAllPublications(1, 10, TypePublishing.POSTPROFILE, this.idUserProfile);
            this._publicationService.updatePublications(publicationsNew);
          } else {
            const publicationsNew = await this._publicationService.getAllPublications(1, 10);
            this._publicationService.updatePublications(publicationsNew);
          }

          if (message.message === 'Publication created successfully') {
            this.myForm.controls['content'].setValue('');
            this.autoResize();
            this._alertService.showAlert(
              translations['addPublication.alertCreatePublicationTitle'],
              translations['addPublication.alertCreatePublicationMessage'],
              Alerts.SUCCESS,
              Position.CENTER,
              true,
              true,
              translations['button.ok'],
            );
          }
        } catch (error) {
          console.error(error);
        } finally {
          loadingPublications.dismiss();
        }
      },
      error: (error) => {
        console.error(error);
        loadingPublications.dismiss();
      },
    });
  }

  autoResize() {
    const postText = this.postTextRef.nativeElement as HTMLTextAreaElement;
    postText.style.height = 'auto';
    postText.style.height = `${postText.scrollHeight}px`;
  }

  onTextareaInput() {
    this.autoResize();
  }

  postPrivacy(privacy: string): void {
    if (privacy === TypePrivacy.PUBLIC) {
      this.privacy = TypePrivacy.PUBLIC;
      this.privacyFront = `<i class="material-icons">language</i> ${translations['publishing.privacy-public']} <i class="material-icons">arrow_drop_down</i>`;
    }
    if (privacy === TypePrivacy.FRIENDS) {
      this.privacy = TypePrivacy.FRIENDS;
      this.privacyFront = `<i class="material-icons">group</i> ${translations['publishing.privacy-friends']} <i class="material-icons">arrow_drop_down</i>`;
    }
    if (privacy === TypePrivacy.PRIVATE) {
      this.privacy = TypePrivacy.PRIVATE;
      this.privacyFront = `<i class="material-icons">lock</i> ${translations['publishing.privacy-private']} <i class="material-icons">arrow_drop_down</i>`;
    }
  }

  openLocationSearch() {
    const dialogRef = this._dialog.open(LocationSearchComponent, {
      width: '400px',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const lat = result.geometry?.lat ? result.geometry.lat : result.lat;
        const lng = result.geometry?.lng ? result.geometry.lng : result.lng;

        const urlMap = `https://www.google.com/maps/?q=${result.formatted}&ll=${lat},${lng}`;
        this.dataGeoLocation = urlMap;
        this.nameGeoLocation = result.formatted.split(',')[0];
        this._cdr.markForCheck();
      }
    });
  }

  openUploadModal() {
    const dialogRef = this._dialog.open(ImageUploadModalComponent, {
      data: {
        maxFiles: this.type === TypePublishing.POST || this.type === TypePublishing.POSTPROFILE ? 10 : 1,
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.selectedFiles = result;
        this.previews = [];
        this.selectedFiles.forEach(file => {
          const reader = new FileReader();
          reader.onload = (e: any) => {
            const fileType = file.type.split('/')[0];
            if (fileType === 'image') {
              this.previews.push({
                type: 'image',
                url: e.target.result
              });
            } else if (fileType === 'video') {
              this.previews.push({
                type: 'video',
                url: e.target.result
              });
            }
          };
          reader.readAsDataURL(file);
        });
      }
    });
  }

  removeFile(index: number) {
    this.selectedFiles.splice(index, 1);
    this.previews.splice(index, 1);
  }
}
