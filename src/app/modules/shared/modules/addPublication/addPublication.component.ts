import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnInit,
  OnDestroy,
  ViewChild,
  AfterViewInit
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LoadingController } from '@ionic/angular';
import { Subject, Subscription, lastValueFrom, takeUntil } from 'rxjs';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import {
  WorkyButtonType,
  WorkyButtonTheme
} from '@shared/modules/buttons/models/worky-button-model';
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
import { MediaFileUpload, PublicationView } from '@shared/interfaces/publicationView.interface';
import { UserService } from '@shared/services/users.service';
import { GlobalEventService } from '@shared/services/globalEventService.service';
import { User } from '@shared/interfaces/user.interface';
import { EmailNotificationService } from '@shared/services/notifications/email-notification.service';
import { environment } from '@env/environment';
import { MailSendValidateData, TemplateEmail } from '@shared/interfaces/mail.interface';
import { NotificationCenterService } from '@shared/services/notificationCenter.service';
import { NotificationType } from '@shared/modules/notifications-panel/enums/notificationsType.enum';
import { GifSearchComponent } from '../gif-search/gif-search.component';

@Component({
  selector: 'worky-add-publication',
  templateUrl: './addPublication.component.html',
  styleUrls: ['./addPublication.component.scss'],
})
export class AddPublicationComponent implements OnInit, OnDestroy, AfterViewInit {
  WorkyButtonType = WorkyButtonType;
  
  WorkyButtonTheme = WorkyButtonTheme;
  
  typePrivacy = TypePrivacy;
  
  typePublishing = TypePublishing;

  user: User = {} as User;
  
  profileImageUrl: string | null = null;
  
  nameGeoLocation = '';
  
  dataGeoLocation = '';
  
  showEmojiMenu = false;
  
  privacy = TypePrivacy.PUBLIC;
  
  privacyFront = '';
  
  previews: { url: string; type: string }[] = [];
  
  selectedFiles: File[] = [];
  
  decodedToken!: Token;
  
  isAuthenticated = false;

  showGifSearch = false;

  loaderSavePublication = false;

  myForm: FormGroup = this._fb.group({
    content: ['', [Validators.required, Validators.minLength(1)]],
    privacy: [''],
    authorId: [''],
    extraData: [''],
    userReceivingId: [''],
  });

  private unsubscribe$ = new Subject<void>();
  private mailSendNotification: MailSendValidateData = {} as MailSendValidateData;
  private subscription?: Subscription;

  @Input() type?: TypePublishing;

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
    private _emailNotificationService: EmailNotificationService,
    private _notificationCenterService: NotificationCenterService
  ) {
    this.isAuthenticated = this._authService.isAuthenticated();
    if (this.isAuthenticated) {
      this.decodedToken = this._authService.getDecodedToken()!;
    }
  }

  ngOnInit() {
    this.postPrivacy(TypePrivacy.PUBLIC);
    this.getUser();
    this.subscription = this._globalEventService.profileImage$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(newImageUrl => {
        this.profileImageUrl = newImageUrl;
        if (this.type === TypePublishing.POSTPROFILE) {
          this.updatePublications(TypePublishing.POSTPROFILE, this.idUserProfile);
        }
      });
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
    this.subscription?.unsubscribe();
  }

  ngAfterViewInit() {
    this.autoResize();
  }

  get userToken(): string {
    return this.decodedToken.id;
  }

  private getUser() {
    this._userService
      .getUserById(this.decodedToken.id)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (response: User) => {
          this.profileImageUrl = response.avatar;
          this.user = response;
          this._cdr.markForCheck();
        },
        error: console.error,
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
    this.myForm.get('content')?.setValue(currentContent + selectedEmoji);
    this.showEmojiMenu = false;
  }

  onSave() {
    this.loaderSavePublication = true;
    this.myForm.controls['authorId'].setValue(this.decodedToken.id);
    this.myForm.controls['privacy'].setValue(this.privacy);
    if (this.type === TypePublishing.POST || this.type === TypePublishing.POSTPROFILE) {
      this.onSavePublication();
    } else if (this.type === TypePublishing.COMMENT) {
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
      idPublication,
    };

    this._commentService.createComment(dataComment).pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: async (message) => {
        await this.handleCommentResponse(message, idPublication);
        this.loaderSavePublication = false;
        loadingComment.dismiss();
      },
      error: error => {
        console.error(error);
        this.loaderSavePublication = false;
        loadingComment.dismiss();
      }
    });
  }

  private async handleCommentResponse(message: any, idPublication: string) {
    try {
      if (this.selectedFiles.length) {
        const response = await lastValueFrom(this.uploadFiles('comments', message.comment._id));
        await this.saveFiles(response, 'comments/', message.comment._id, TypePublishing.COMMENT);
      }

      await this.updatePublicationAndNotify(idPublication, message.comment);

      if (message.message === 'Comment created successfully') {
        this.myForm.controls['content'].setValue('');
        this.autoResize();
        this.showSuccessAlert(
          translations['addPublication.alertCreateCommentTitle'],
          translations['addPublication.alertCreateCommentMessage']
        );
      }
    } catch (error) {
      console.error(error);
    }
  }

  private async onSavePublication() {
    const loadingPublications = await this._loadingCtrl.create({
      message: translations['addPublication.loadingPublicationMessage'],
    });

    loadingPublications.present();

    this.setExtraData();

    if (this.type === TypePublishing.POSTPROFILE && this.idUserProfile !== this.decodedToken.id) {
      this.myForm.controls['userReceivingId'].setValue(this.idUserProfile);
      this.myForm.controls['privacy'].setValue(TypePrivacy.FRIENDS);
    }

    this._publicationService.createPost(this.myForm.value).pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: async (message: any) => {
        await this.handlePublicationResponse(message);
        this.loaderSavePublication = false;
        loadingPublications.dismiss();
      },
      error: error => {
        console.error(error);
        this.loaderSavePublication = false;
        loadingPublications.dismiss();
      },
    });
  }

  openGifSearch() {
    const dialogConfig = new MatDialogConfig();

    dialogConfig.width = '540px';
    dialogConfig.height = '500px';
    dialogConfig.panelClass = 'gifSearch-modal-container';

    const dialogRef = this._dialog.open(GifSearchComponent, dialogConfig);

    dialogRef.componentInstance.gifSelected.subscribe((gifUrl: string) => {
      this.onGifSelected(gifUrl);
      dialogRef.close();
    });
  }

  toggleGifSearch() {
    this.openGifSearch();
  }

  onGifSelected(gifUrl: string) {
    const currentContent = this.myForm.get('content')?.value;
    this.myForm.get('content')?.setValue(`${currentContent} ![GIF](${gifUrl})\n`);
    this.showGifSearch = false;
  }

  private async handlePublicationResponse(message: any) {
    try {
      if (this.selectedFiles.length) {
        const response = await lastValueFrom(this.uploadFiles('publications', message.publications._id));
        await this.saveFiles(response, 'publications/', message.publications._id, TypePublishing.POST);
      }

      await this.updatePublicationAndNotify(message.publications._id);

      if (message.message === 'Publication created successfully') {
        this.myForm.controls['content'].setValue('');
        this.autoResize();
        this.showSuccessAlert(
          translations['addPublication.alertCreatePublicationTitle'],
          translations['addPublication.alertCreatePublicationMessage']
        );
      }
    } catch (error) {
      console.error(error);
    }
  }

  private setExtraData() {
    const extraData: ExtraData = {
      locations: {
        title: this.nameGeoLocation,
        urlMap: this.dataGeoLocation,
      }
    };
    if (this.nameGeoLocation || this.dataGeoLocation) {
      this.myForm.controls['extraData'].setValue(JSON.stringify(extraData));
    }
  }

  private uploadFiles(folder: string, id: string) {
    return this._fileUploadService.uploadFile(this.selectedFiles, folder).pipe(takeUntil(this.unsubscribe$));
  }

  private async saveFiles(response: MediaFileUpload[], saveLocation: string, id: string, type: TypePublishing) {
    const saveFilePromises = response.map(file => {
      return lastValueFrom(
        this._fileUploadService.saveUrlFile(
          saveLocation + file.filename,
          saveLocation + file.filenameThumbnail,
          saveLocation + file.filenameCompressed,
          id,
          type
        ).pipe(takeUntil(this.unsubscribe$))
      );
    });
    await Promise.all(saveFilePromises);
    this.selectedFiles = [];
    this.previews = [];
    this._cdr.markForCheck();
  }

  private async updatePublicationAndNotify(idPublication: string, comment?: any) {
    const publication = await lastValueFrom(this._publicationService.getPublicationId(idPublication).pipe(takeUntil(this.unsubscribe$)));
    this._publicationService.updatePublications(publication);
    if (comment) {
      this.sendEmailNotificationReaction(publication[0], comment);
      this.createNotificationAndSendComment(publication[0], comment);
    }
  }

  private createNotificationAndSendComment(publication: PublicationView, comment: any) {
    if (this.userToken === publication.author._id) return;

    const dataNotification = this.createNotificationData(publication, comment);

    this._notificationCenterService.createNotification({
      userId: publication.author._id,
      type: NotificationType.COMMENT,
      content: 'Han comentado tu publicación',
      link: `/publication/${publication._id}`,
      additionalData: JSON.stringify(dataNotification),
    }).pipe(takeUntil(this.unsubscribe$)).subscribe();

    this._notificationCommentService.sendNotificationComment(dataNotification);
  }

  private createNotificationData(publication: PublicationView, comment: any) {
    return {
      comment: comment.content,
      postId: publication._id,
      userIdComment: this.decodedToken.id,
      avatarComment: this.decodedToken.avatar,
      nameComment: this.decodedToken.name,
      userIdReceiver: publication.author._id,
      avatarReceiver: publication.author.avatar,
      nameReceiver: `${publication.author.name} ${publication.author.lastName}`,
    };
  }

  private showSuccessAlert(title: string, message: string) {
    this._alertService.showAlert(
      title,
      message,
      Alerts.SUCCESS,
      Position.CENTER,
      true,
      true,
      translations['button.ok'],
    );
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
    switch (privacy) {
      case TypePrivacy.PUBLIC:
        this.privacy = TypePrivacy.PUBLIC;
        this.privacyFront = `<i class="material-icons">language</i> ${translations['publishing.privacy-public']} <i class="material-icons">arrow_drop_down</i>`;
        break;
      case TypePrivacy.FRIENDS:
        this.privacy = TypePrivacy.FRIENDS;
        this.privacyFront = `<i class="material-icons">group</i> ${translations['publishing.privacy-friends']} <i class="material-icons">arrow_drop_down</i>`;
        break;
      case TypePrivacy.PRIVATE:
        this.privacy = TypePrivacy.PRIVATE;
        this.privacyFront = `<i class="material-icons">lock</i> ${translations['publishing.privacy-private']} <i class="material-icons">arrow_drop_down</i>`;
        break;
    }
  }

  openLocationSearch() {
    const dialogRef = this._dialog.open(LocationSearchComponent, {
      width: '400px',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.setLocationData(result);
        this._cdr.markForCheck();
      }
    });
  }

  private setLocationData(result: any) {
    const lat = result.geometry?.lat ?? result.lat;
    const lng = result.geometry?.lng ?? result.lng;
    this.dataGeoLocation = `https://www.google.com/maps/?q=${result.formatted}&ll=${lat},${lng}`;
    this.nameGeoLocation = result.formatted.split(',')[0];
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
        this.createPreviews();
      }
    });
  }

  private createPreviews() {
    this.previews = [];
    this.selectedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const fileType = file.type.split('/')[0];
        this.previews.push({
          type: fileType === 'image' ? 'image' : 'video',
          url: e.target.result
        });
      };
      reader.readAsDataURL(file);
    });
  }

  removeFile(index: number) {
    this.selectedFiles.splice(index, 1);
    this.previews.splice(index, 1);
  }

  sendEmailNotificationReaction(publication: any, comment: any) {
    if (this.userToken === publication.author._id) return;

    this.mailSendNotification = {
      url: `${environment.BASE_URL}/publication/${publication._id}`,
      subject: 'Han comentado tu publicación',
      title: 'Notificación de comentario en publicación',
      greet: 'Hola',
      message: `El usuario ${this.user.name} ${this.user.lastName} ha comentado tu publicación`,
      subMessage: `Su comentario fue: ${comment.content}`,
      buttonMessage: 'Ver publicación',
      template: TemplateEmail.NOTIFICATION,
      email: publication?.author.email,
    };

    this._emailNotificationService.sendNotification(this.mailSendNotification).pipe(takeUntil(this.unsubscribe$)).subscribe();
  }

  private async updatePublications(type: TypePublishing, idUserProfile?: string) {
    try {
      const publicationsNew = await lastValueFrom(this._publicationService.getAllPublications(1, 10, type, idUserProfile));
      this._publicationService.updatePublications(publicationsNew.publications);
    } catch (error) {
      console.error('Error getting publications', error);
    }
  }

insertText(markdown: string) {
  const textarea = this.postTextRef.nativeElement as HTMLTextAreaElement;
  const startPos = textarea.selectionStart;
  const endPos = textarea.selectionEnd;
  const selectedText = this.myForm.get('content')?.value.substring(startPos, endPos);

  let newText;
  if (selectedText) {
    newText = this.myForm.get('content')?.value.substring(0, startPos) + markdown.replace('placeholder', selectedText) + this.myForm.get('content')?.value.substring(endPos);
  } else {
    newText = this.myForm.get('content')?.value.substring(0, startPos) + markdown.replace('placeholder', '') + this.myForm.get('content')?.value.substring(endPos);
  }

  this.myForm.get('content')?.setValue(newText);
  textarea.focus();
  textarea.selectionStart = startPos + markdown.length;
  textarea.selectionEnd = startPos + markdown.length;
}

}
