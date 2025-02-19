import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnInit,
  OnDestroy,
  ViewChild,
  NgZone
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonTextarea, LoadingController } from '@ionic/angular';
import { Subject, Subscription, lastValueFrom, takeUntil } from 'rxjs';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import {
  WorkyButtonType,
  WorkyButtonTheme
} from '@shared/modules/buttons/models/worky-button-model';
import { AuthService } from '@auth/services/auth.service';
import { PublicationService } from '@shared/services/core-apis/publication.service';
import { CommentService } from '@shared/services/core-apis/comment.service';
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
import { FileUploadService } from '@shared/services/core-apis/file-upload.service';
import { MediaFileUpload, PublicationView } from '@shared/interfaces/publicationView.interface';
import { UserService } from '@shared/services/core-apis/users.service';
import { GlobalEventService } from '@shared/services/globalEventService.service';
import { User } from '@shared/interfaces/user.interface';
import { EmailNotificationService } from '@shared/services/notifications/email-notification.service';
import { environment } from '@env/environment';
import { MailSendValidateData, TemplateEmail } from '@shared/interfaces/mail.interface';
import { NotificationCenterService } from '@shared/services/core-apis/notificationCenter.service';
import { NotificationType } from '@shared/modules/notifications-panel/enums/notificationsType.enum';
import { GifSearchComponent } from '../gif-search/gif-search.component';

@Component({
  selector: 'worky-add-publication',
  templateUrl: './addPublication.component.html',
  styleUrls: ['./addPublication.component.scss'],
})
export class AddPublicationComponent implements OnInit, OnDestroy {
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

  loaderPreviews = false;

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

  @Input() idMedia?: string;

  @ViewChild('postTextRef', { static: false }) postTextRef!: IonTextarea;
  postText!: string;

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
    private _notificationCenterService: NotificationCenterService,
    private _ngZone: NgZone
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
    } else if (this.type === TypePublishing.COMMENT || this.type === this.typePublishing.IMAGEVIEW) {
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
      idPublication: this.type === this.typePublishing.COMMENT ? idPublication : null,
      idMedia: this.type === this.typePublishing.IMAGEVIEW ? this.idMedia : null,
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
        const response = await this.uploadFiles('comments', message.comment._id);
        await this.saveFiles(response, environment.APIFILESERVICE + 'comments/', message.comment._id, TypePublishing.COMMENT);
      }

      await this.updatePublicationAndNotify(idPublication, message.comment);

      if (message.message === 'Comment created successfully') {
        this.myForm.controls['content'].setValue('');
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

    await this._publicationService.createPost(this.myForm.value).pipe(takeUntil(this.unsubscribe$)).subscribe({
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
        const response = await this.uploadFiles('publications', message.publications._id);
        await this.saveFiles(response, environment.APIFILESERVICE + 'publications/', message.publications._id, TypePublishing.POST);
      }

      await this.updatePublicationAndNotify(message.publications._id);

      if (message.message === 'Publication created successfully') {
        this.myForm.controls['content'].setValue('');
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

  private uploadFiles(folder: string, id: string): Promise<MediaFileUpload[]> {
    return lastValueFrom(this._fileUploadService.uploadFile(this.selectedFiles, folder).pipe(takeUntil(this.unsubscribe$)));
  }

  private async saveFiles(response: MediaFileUpload[], saveLocation: string, id: string, type: TypePublishing) {
    for (const file of response) {
      try {
        await lastValueFrom(
          this._fileUploadService.saveUrlFile(
            saveLocation + file.filename,
            saveLocation + file.filenameThumbnail,
            saveLocation + file.filenameCompressed,
            id,
            type
          ).pipe(takeUntil(this.unsubscribe$))
        );
      } catch (error) {
        console.error(`Error saving file ${file.filename}: ${error}`);
      }
    }

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

    const dataNotification = this.createNotificationData(publication, comment);

    this._notificationCommentService.sendNotificationComment(dataNotification);

    if (this.userToken === publication.author._id) return;

    this._notificationCenterService.createNotification({
      userId: publication.author._id,
      type: NotificationType.COMMENT,
      content: this.type === this.typePublishing.IMAGEVIEW ? translations['notification.commentPublicationImage'] : translations['notification.commentPublication'],
      link: `/publication/${publication._id}`,
      additionalData: JSON.stringify(dataNotification),
    }).pipe(takeUntil(this.unsubscribe$)).subscribe();


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

  onTextareaInput() {
    if (this.myForm.controls['content'].value.trim().length === 0) {
      this.myForm.controls['content'].setErrors({ required: true });
    } else {
      this.myForm.controls['content'].setErrors(null);
    }
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

    dialogRef.afterClosed().pipe(takeUntil(this.unsubscribe$)).subscribe(result => {
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

    dialogRef.afterClosed().pipe(
      takeUntil(this.unsubscribe$)
    ).subscribe({
      next: (result) => {
        this.loaderPreviews = true;
        if (result) {
          this.selectedFiles = result;
          this.createPreviews();
          this._cdr.markForCheck();
        } else {
          this.loaderPreviews = false;
        }
      },
    });
  }

  private async createPreviews() {
    this.previews = [];
    let count = 0;
    this.selectedFiles.forEach(file => {
      count++;
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
    if (count >= this.selectedFiles.length){
      setTimeout(() => {
        this.loaderPreviews = false;
      }, 1500);
    }

    this._cdr.markForCheck();
  }

  replaceVariables(text: string, variables: { [key: string]: any }): string {
    return text.replace(/{{(.*?)}}/g, (_, key) => {
      return variables[key.trim()] || '';
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
      subject: translations['email.commentPublicationSubject'],
      title: translations['email.commentPublicationTitle'],
      greet: translations['email.commentPublicationGreet'],
      message: this.replaceVariables(translations['email.commentPublicationMessage'], { 'name': this.user.name, 'lastName': this.user.lastName }),
      subMessage: this.replaceVariables(translations['email.commentPublicationSubMessage'], { 'comment': comment.content }),
      buttonMessage: translations['email.commentPublicationButtonMessage'],
      template: TemplateEmail.NOTIFICATION,
      templateLogo: environment.TEMPLATE_EMAIL_LOGO,
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
    const textareaValue = this.postTextRef.value || '';
    
    const textarea = this.postTextRef.getInputElement().then((textarea: HTMLTextAreaElement) => {
      const startPos = textarea.selectionStart;
      const endPos = textarea.selectionEnd;

      const selectedText = textareaValue.substring(startPos, endPos);
      let newText;
      let cursorPos;

      if (selectedText) {
        newText = textareaValue.substring(0, startPos)
          + markdown.replace('placeholder', selectedText)
          + textareaValue.substring(endPos);

        cursorPos = startPos + markdown.length;
      } else {
        const placeholderIndex = markdown.indexOf('placeholder');
        const beforePlaceholder = markdown.substring(0, placeholderIndex);
        const afterPlaceholder = markdown.substring(placeholderIndex + 'placeholder'.length);

        newText = textareaValue.substring(0, startPos)
          + beforePlaceholder
          + afterPlaceholder
          + textareaValue.substring(endPos);

        cursorPos = startPos + beforePlaceholder.length;
      }

      this.myForm.get('content')?.setValue(newText);

      textarea.focus();
      textarea.setSelectionRange(cursorPos, cursorPos);
    });
  }

}
