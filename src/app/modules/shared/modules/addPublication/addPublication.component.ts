import {
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  Output,
  EventEmitter,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonTextarea } from '@ionic/angular';
import { Subject, Subscription, lastValueFrom, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
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
import { TooltipsOnboardingService } from '@shared/services/tooltips-onboarding.service';
import { UtilityService } from '@shared/services/utility.service';
import { ImageLoadOptions } from '../../services/image.service';
import { Router } from '@angular/router';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { LazyCssService } from '@shared/services/core-apis/lazy-css.service';
import { FontLoaderService } from '@shared/services/core-apis/font-loader.service';
import { ConfigService } from '@shared/services/core-apis/config.service';
import { FeatureWallService } from '@shared/services/feature-wall.service';
import { SubscriptionService } from '@shared/services/subscription.service';

@Component({
    selector: 'worky-add-publication',
    templateUrl: './addPublication.component.html',
    styleUrls: ['./addPublication.component.scss'],
    standalone: false
})
export class AddPublicationComponent implements OnInit, OnDestroy {
  WorkyButtonType = WorkyButtonType;

  typePrivacy = TypePrivacy;

  typePublishing = TypePublishing;

  user: User = {} as User;

  profileImageUrl: string | null = '';

  nameGeoLocation = '';

  dataGeoLocation = '';

  privacy = TypePrivacy.PUBLIC;

  privacyFront: { icon: string; label: string } = { icon: 'language', label: '' };

  previews: { url: string; type: string }[] = [];

  selectedFiles: File[] = [];

  decodedToken: Token = this._authService.getDecodedToken()!;

  isAuthenticated = false;

  showGifSearch = false;

  loaderSavePublication = false;

  loaderPreviews = false;

  myForm: FormGroup = this._fb.group({
    content: ['', [Validators.required, Validators.minLength(1)]],
    privacy: [''],
    authorId: [''],
    extraData: [null],
    containsMedia: [false],
    userReceivingId: [''],
    isPremiumContent: [false],
    groupId: [''],
  });

  avatarLoading: boolean = true;
  nameLoading: boolean = true;
  privacyLoading: boolean = true;
  textareaLoading: boolean = true;
  locationLoading: boolean = true;
  markdownButtonsLoading: boolean = true;
  optionsButtonsLoading: boolean = true;
  publishButtonLoading: boolean = true;

  private unsubscribe$ = new Subject<void>();
  private mailSendNotification: MailSendValidateData = {} as MailSendValidateData;
  private subscription?: Subscription;

  @Input() type?: TypePublishing;

  @Input() groupId?: string;

  @Output() published = new EventEmitter<void>();

  @Input() idPublication?: string;

  @Input() indexPublication?: number;

  @Input() idUserProfile?: string;

  @Input() idMedia?: string;
  imageOptions: ImageLoadOptions = {
    maxRetries: 2,
    retryDelay: 1000,
    timeout: 10000,
    fallbackUrl: '/assets/images/placeholder.jpg'
  };

  @ViewChild('postTextRef', { static: false }) postTextRef!: IonTextarea;

  @ViewChild('textarea', { static: false }) textarea!: ElementRef;

  content: string = '';

  showEmojiMenu: boolean = false;

  showUploadModal: boolean = false;

  showLocationSearch: boolean = false;

  isLoading: boolean = false;

  readonly TypePublishing = TypePublishing;

  readonly WorkyButtonTheme = WorkyButtonTheme;

  private destroy$ = new Subject<void>();

  constructor(
    private _fb: FormBuilder,
    private _authService: AuthService,
    private _publicationService: PublicationService,
    private _commentService: CommentService,
    private _alertService: AlertService,
    private _notificationCommentService: NotificationCommentService,
    private _dialog: MatDialog,
    private _cdr: ChangeDetectorRef,
    private _fileUploadService: FileUploadService,
    private _userService: UserService,
    private _globalEventService: GlobalEventService,
    private _emailNotificationService: EmailNotificationService,
    private _notificationCenterService: NotificationCenterService,
    private _tooltipsOnboardingService: TooltipsOnboardingService,
    private _utilityService: UtilityService,
    private _router: Router,
    private _logService: LogService,
    private _lazyCssService: LazyCssService,
    private _fontLoaderService: FontLoaderService,
    private _configService: ConfigService,
    private readonly _featureWallService: FeatureWallService,
    private readonly _subscriptionService: SubscriptionService,
  ) { }

  async ngOnInit() {
    // Load subscription mode status if not already set by a prior config load
    if (!this._configService.configSnapshot()) {
      this._configService.getSubscriptionMode()
        .pipe(takeUntil(this.unsubscribe$))
        .subscribe();
    }

    // Wait for authentication before getting token
    await this._authService.isAuthenticated();
    
    const token = this._authService.getDecodedToken();
    if (!token) {
      this._logService.log(
        LevelLogEnum.ERROR,
        'AddPublicationComponent',
        'No valid token found, cannot initialize component',
        {}
      );
      return;
    }
    
    this.decodedToken = token;
    
    // Set initial avatar from token if available - normalize URL
    if (this.decodedToken.avatar && this.decodedToken.avatar.trim() !== '' && this.decodedToken.avatar !== 'null' && this.decodedToken.avatar !== 'undefined') {
      this.profileImageUrl = this._utilityService.normalizeImageUrl(this.decodedToken.avatar, environment.MINIO_BUCKET_URL || '');
    }
    
    this.postPrivacy(TypePrivacy.PUBLIC);
    if (this.groupId) {
      this.myForm.patchValue({ groupId: this.groupId });
    }
    this.getUser();
    
    // Subscribe to profile image updates, but only update if newImageUrl is not null
    this.subscription = this._globalEventService.profileImage$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(newImageUrl => {
        // Only update if we have a valid new image URL - normalize URL
        if (newImageUrl && newImageUrl.trim() !== '' && newImageUrl !== 'null' && newImageUrl !== 'undefined') {
          this.profileImageUrl = this._utilityService.normalizeImageUrl(newImageUrl, environment.MINIO_BUCKET_URL || '');
          this._cdr.markForCheck();
        }
        if (this.type === TypePublishing.POST_PROFILE) {
          this.updatePublications(TypePublishing.POST_PROFILE, this.idUserProfile);
        }
      });
      setTimeout(() => {
        this.startOnboarding();
      }
      , 1000);

    this.simulateProgressiveLoading();
    this.loadRequiredResources();
    
    // Safety timeout to prevent infinite skeleton loading
    setTimeout(() => {
      this.checkAndResolveLoadingStates();
    }, 5000);
    

  }

  onAvatarLoad() {
    this.avatarLoading = false;
    this._cdr.markForCheck();
  }

  onAvatarError() {
    this.avatarLoading = false;
    this._cdr.markForCheck();
    
    this._logService.log(
      LevelLogEnum.WARN,
      'AddPublicationComponent',
      'Avatar failed to load, using fallback'
    );
  }

  onNameLoad() {
    this.nameLoading = false;
    this._cdr.markForCheck();
  }

  onPrivacyLoad() {
    this.privacyLoading = false;
    this._cdr.markForCheck();
  }

  onTextareaLoad() {
    this.textareaLoading = false;
    this._cdr.markForCheck();
  }

  onLocationLoad() {
    this.locationLoading = false;
    this._cdr.markForCheck();
  }

  onMarkdownButtonsLoad() {
    this.markdownButtonsLoading = false;
    this._cdr.markForCheck();
  }

  onOptionsButtonsLoad() {
    this.optionsButtonsLoading = false;
    this._cdr.markForCheck();
  }

  onPublishButtonLoad() {
    this.publishButtonLoading = false;
    this._cdr.markForCheck();
  }

  // Check and resolve problematic loading states
  private checkAndResolveLoadingStates() {
    // Check for stuck loading states
    const stuckStates = [];
    
    if (this.avatarLoading) stuckStates.push('avatar');
    if (this.nameLoading) stuckStates.push('name');
    if (this.privacyLoading) stuckStates.push('privacy');
    if (this.textareaLoading) stuckStates.push('textarea');
    if (this.locationLoading) stuckStates.push('location');
    if (this.markdownButtonsLoading) stuckStates.push('markdownButtons');
    if (this.optionsButtonsLoading) stuckStates.push('optionsButtons');
    if (this.publishButtonLoading) stuckStates.push('publishButton');
    
    if (stuckStates.length > 0) {
      this._logService.log(
        LevelLogEnum.WARN,
        'AddPublicationComponent',
        'Detected stuck loading states',
        { stuckStates }
      );
      
      // Force resolution of stuck states
      this.onAvatarLoad();
      this.onNameLoad();
      this.onPrivacyLoad();
      this.onTextareaLoad();
      this.onLocationLoad();
      this.onMarkdownButtonsLoad();
      this.onOptionsButtonsLoad();
      this.onPublishButtonLoad();
    }
  }

  private simulateProgressiveLoading() {
    // Load all elements immediately without artificial delays
    this.onNameLoad();
    this.onPrivacyLoad();
    this.onTextareaLoad();
    this.onLocationLoad();
    this.onMarkdownButtonsLoad();
    this.onOptionsButtonsLoad();
    this.onPublishButtonLoad();
    
    // Avatar is handled in getUser() to avoid conflicts
    // Only resolve here if we already have user data
    if (this.user && this.user.name) {
      if (this.profileImageUrl && this.profileImageUrl.trim() !== '') {
        this.onAvatarLoad();
      } else {
        this.onAvatarLoad();
      }
    }
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
    this.subscription?.unsubscribe();
  }

  startOnboarding() {
    const steps = [
      {
        element: '.textarea-container',
        popover: {
          title: 'Bienvenido',
          description: 'Este es el primer paso del tutorial. Aquí puedes publicar contenido.',
        },
      },
      {
        element: '.gif-icon',
        popover: {
          title: 'Buscador de GIFs',
          description: 'Aquí puedes buscar GIFs para añadir a tu publicación.',
        },
      },
      {
        element: '.file-upload',
        popover: {
          title: translations['addPublication.onboarding.uploadImages.title'],
          description: translations['addPublication.onboarding.uploadImages.description'],
        },
      },
      {
        element: '.location-on',
        popover: {
          title: translations['addPublication.onboarding.location.title'],
          description: translations['addPublication.onboarding.location.description'],
          //side: 'right',
        },
      },
      {
        element: '.emoji-icon',
        popover: {
          title: translations['addPublication.onboarding.emojis.title'],
          description: translations['addPublication.onboarding.emojis.description'],
          //side: 'right',
        },
      },
      {
        element: '.markdown-help',
        popover: {
          title: translations['addPublication.onboarding.markdown.title'],
          description: translations['addPublication.onboarding.markdown.description'],
          //side: 'right',
        },
      }
    ];

    this._tooltipsOnboardingService.start(steps);
  }

  get userToken(): string {
    return this.decodedToken.id;
  }

  private getUser() {
    if (!this.decodedToken || !this.decodedToken.id) {
      this._logService.log(
        LevelLogEnum.ERROR,
        'AddPublicationComponent',
        'Cannot get user: invalid or missing token',
        {}
      );
      this.onAvatarLoad();
      this.onNameLoad();
      return;
    }

    this._userService
      .getUserByIdFresh(this.decodedToken.id)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (response: User) => {
          // Handle avatar URL - normalize URL from server
          if (response.avatar && response.avatar.trim() !== '' && response.avatar !== 'null' && response.avatar !== 'undefined') {
            this.profileImageUrl = this._utilityService.normalizeImageUrl(response.avatar, environment.MINIO_BUCKET_URL || '');
          } else {
            // If server doesn't have avatar, keep the one from token if available - normalize URL
            if (!this.profileImageUrl && this.decodedToken.avatar && this.decodedToken.avatar.trim() !== '' && this.decodedToken.avatar !== 'null' && this.decodedToken.avatar !== 'undefined') {
              // Keep the avatar from token - normalize URL
              this.profileImageUrl = this._utilityService.normalizeImageUrl(this.decodedToken.avatar, environment.MINIO_BUCKET_URL || '');
            } else if (!this.profileImageUrl) {
              // Only set to null if we don't have any avatar
              this.profileImageUrl = null;
            }
          }
          
          this.user = response;
          this._cdr.markForCheck();
          

          

          
          // Always resolve avatar loading, with or without image
          if (this.profileImageUrl && this.profileImageUrl.trim() !== '') {
            this.onAvatarLoad();
          } else {
            // If no avatar, resolve immediately
            this.onAvatarLoad();
          }
        },
        error: (error) => {
          this._logService.log(
            LevelLogEnum.ERROR,
            'AddPublicationComponent',
            'Error getting user data',
            { error: error.message }
          );
          // Resolve loading states on error to prevent UI freeze
          this.onAvatarLoad();
          this.onNameLoad();
        },
      });
  }

  toggleEmojiMenu() {
    this.showEmojiMenu = !this.showEmojiMenu;
    
    if (this.showEmojiMenu) {
      this.loadEmojiMartCss();
    }
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
    this.myForm.controls['authorId'].setValue(this.decodedToken.id);
    this.myForm.controls['privacy'].setValue(this.privacy);
    
    // Store content and files before clearing
    const contentBackup = this.myForm.controls['content'].value;
    const filesBackup = [...this.selectedFiles];
    const previewsBackup = [...this.previews];
    
    // Clear UI immediately for better UX
    this.myForm.controls['content'].setValue('');
    this.selectedFiles = [];
    this.previews = [];
    this._cdr.markForCheck();
    
    // Restore content and files for processing in background
    this.myForm.controls['content'].setValue(contentBackup);
    
    if (this.type === TypePublishing.POST || this.type === TypePublishing.POST_PROFILE) {
      this.onSavePublication(filesBackup, previewsBackup);
    } else if (this.type === TypePublishing.COMMENT || this.type === this.typePublishing.IMAGE_VIEW) {
      this.onSaveComment(this.idPublication as string, filesBackup, previewsBackup);
    }
  }

  private async onSaveComment(idPublication: string, filesBackup: File[] = [], previewsBackup: any[] = []) {
    const dataComment: CreateComment = {
      content: this.myForm.controls['content'].value,
      containsMedia: filesBackup.length > 0,
      authorId: this.decodedToken.id,
      idPublication: this.type === this.typePublishing.COMMENT ? idPublication : null,
      idMedia: this.type === this.typePublishing.IMAGE_VIEW ? this.idMedia : null,
    };

    this._commentService.createComment(dataComment).pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: async (message) => {
        await this.handleCommentResponse(message, idPublication, filesBackup);
        // Clear content after successful creation
        this.myForm.controls['content'].setValue('');
      },
      error: error => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'AddPublicationComponent',
          'Error creating comment',
          { error: error instanceof Error ? error.message : String(error) }
        );
        // Restore content and files on error
        this.myForm.controls['content'].setValue(dataComment.content);
        this.selectedFiles = filesBackup;
        this.previews = previewsBackup;
        this._cdr.markForCheck();
      }
    });
  }

  private async handleCommentResponse(message: any, idPublication: string, filesBackup: File[] = []) {
    try {
      if (filesBackup.length) {
        const urlMedia = environment.APIFILESERVICE + 'comments/';
        const idReference = message.comment._id;
        // Upload files in background using the backup
        await this.uploadFilesInBackground('comments', idReference, urlMedia, TypePublishing.COMMENT, filesBackup);
      }

      await this.updatePublicationAndNotify(idPublication, message.comment);
    } catch (error) {
      this._logService.log(
        LevelLogEnum.ERROR,
        'AddPublicationComponent',
        'Error handling comment response',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  private async onSavePublication(filesBackup: File[] = [], previewsBackup: any[] = []) {
    if (this._configService.subscriptionModeSnapshot() && this._subscriptionService.isPremiumSnapshot() && !this._subscriptionService.hasFeature('feed')) {
      this._featureWallService.show('feed', this._subscriptionService.getPlanFeatures());
      return;
    }
    this.setExtraData();

    if (this.type === TypePublishing.POST_PROFILE && this.idUserProfile !== this.decodedToken.id) {
      this.myForm.controls['userReceivingId'].setValue(this.idUserProfile);
      this.myForm.controls['privacy'].setValue(TypePrivacy.FRIENDS);
    }

    const containsMedia = filesBackup.length > 0;
    this.myForm.controls['containsMedia'].setValue(containsMedia);

    await this._publicationService.createPost(this.myForm.value).pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: async (message: any) => {
        await this.handlePublicationResponse(message, filesBackup);
        this.myForm.controls['content'].setValue('');
        this.published.emit();
      },
      error: error => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'AddPublicationComponent',
          'Error creating publication',
          { error: error.message }
        );
        // Restore content and files on error
        this.myForm.controls['content'].setValue(this.myForm.value.content);
        this.selectedFiles = filesBackup;
        this.previews = previewsBackup;
        this._cdr.markForCheck();
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

  private async handlePublicationResponse(message: any, filesBackup: File[] = []) {
    try {
      const hasMedia = filesBackup.length > 0;
      
      if (hasMedia) {
        const urlMedia = environment.APIFILESERVICE + 'publications/';
        const idReference = message.publications._id;
        // Upload files in background using the backup
        await this.uploadFilesInBackground('publications', idReference, urlMedia, TypePublishing.POST, filesBackup);
      }

      await this.updatePublicationAndNotify(message.publications._id);
    } catch (error) {
      this._logService.log(
        LevelLogEnum.ERROR,
        'AddPublicationComponent',
        'Error handling publication response',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  private setExtraData() {
    if (this.nameGeoLocation || this.dataGeoLocation) {
      this.myForm.controls['extraData'].setValue({
        locations: {
          title: this.nameGeoLocation,
          urlMap: this.dataGeoLocation,
        },
      });
    } else {
      this.myForm.controls['extraData'].setValue(null);
    }
  }

  private uploadFiles(folder: string, idReference?: string, urlMedia?: string, type?: TypePublishing): Promise<MediaFileUpload[]> {
    return lastValueFrom(this._fileUploadService.uploadFile(this.selectedFiles, folder, idReference, urlMedia, type).pipe(takeUntil(this.unsubscribe$)));
  }

  private uploadFilesInBackground(folder: string, idReference?: string, urlMedia?: string, type?: TypePublishing, files?: File[]): Promise<MediaFileUpload[]> {
    const filesToUpload = files || this.selectedFiles;
    return lastValueFrom(this._fileUploadService.uploadFile(filesToUpload, folder, idReference, urlMedia, type).pipe(takeUntil(this.unsubscribe$)));
  }

  private async updatePublicationAndNotify(idPublication: string, comment?: any) {
    // Force refresh to bypass cache and get fresh data including new comment
    const publication = await lastValueFrom(this._publicationService.getPublicationId(idPublication, true).pipe(takeUntil(this.unsubscribe$)));
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
      content: this.type === this.typePublishing.IMAGE_VIEW ? translations['notification.commentPublicationImage'] : translations['notification.commentPublication'],
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
        this.privacyFront = { icon: 'language', label: translations['publishing.privacy-public'] };
        break;
      case TypePrivacy.FRIENDS:
        this.privacy = TypePrivacy.FRIENDS;
        this.privacyFront = { icon: 'group', label: translations['publishing.privacy-friends'] };
        break;
      case TypePrivacy.PRIVATE:
        this.privacy = TypePrivacy.PRIVATE;
        this.privacyFront = { icon: 'lock', label: translations['publishing.privacy-private'] };
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
        maxFiles: this.type === TypePublishing.POST || this.type === TypePublishing.POST_PROFILE ? 10 : 1,
      }
    });

    dialogRef.afterClosed().pipe(
      takeUntil(this.unsubscribe$)
    ).subscribe({
      next: (result) => {
        this.loaderPreviews = true;
        if (result) {
          this.selectedFiles = result;
          this._cdr.markForCheck();
          this.createPreviews();
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
        this._cdr.markForCheck();
      };
      reader.readAsDataURL(file);
    });
    if (count >= this.selectedFiles.length){
      setTimeout(() => {
        this.loaderPreviews = false;
        this._cdr.markForCheck();
      }, 500);
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
      this._logService.log(
        LevelLogEnum.ERROR,
        'AddPublicationComponent',
        'Error getting publications',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  insertText(markdown: string) {
    const textareaValue = this.myForm.get('content')?.value || '';

    this.postTextRef.getInputElement().then((textarea: HTMLTextAreaElement) => {
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

  onImageError(event: Event): void {
    this._utilityService.handleImageError(event, 'assets/img/shared/handleImageError.png');
  }

  /**
   * Carga recursos necesarios de forma lazy
   */
  private async loadRequiredResources() {
    try {
      // Load Material Icons if not already loaded
      if (!this._fontLoaderService.isFontLoaded('material-icons')) {
        await this._fontLoaderService.loadMaterialIcons();
      }

      // Load Material Symbols if not already loaded
      if (!this._fontLoaderService.isFontLoaded('material-symbols-sharp')) {
        await this._fontLoaderService.loadMaterialSymbolsSharp();
      }
    } catch (error) {
      this._logService.log(LevelLogEnum.ERROR, 'AddPublicationComponent', 'Error cargando recursos lazy');
    }
  }

  /**
   * Carga CSS de emoji-mart solo cuando se abre el menú
   */
  private async loadEmojiMartCss() {
    try {
      if (!this._lazyCssService.isLoaded('emoji-mart')) {
        await this._lazyCssService.loadEmojiMartCss();
      }
    } catch (error) {
      this._logService.log(
        LevelLogEnum.ERROR,
        'AddPublicationComponent',
        'Error loading emoji-mart CSS',
        { error: String(error) }
      );
    }
  }

}
