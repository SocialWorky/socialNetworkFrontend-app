import { ChangeDetectorRef, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LoadingController } from '@ionic/angular';
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
import { CreateComment} from '@shared/interfaces/addComment.interface';
import { NotificationCommentService } from '@shared/services/notificationComment.service';
import { LocationSearchComponent } from '../location-search/location-search.component';
import { ExtraData } from '@shared/modules/addPublication/interfaces/createPost.interface';

@Component({
  selector: 'worky-add-publication',
  templateUrl: './addPublication.component.html',
  styleUrls: ['./addPublication.component.scss'],
})
export class AddPublicationComponent  implements OnInit {
  WorkyButtonType = WorkyButtonType;

  WorkyButtonTheme = WorkyButtonTheme;

  userName: string = '';

  nameGeoLocation: string = '';

  dataGeoLocation: string = '';

  showEmojiMenu = false;

  privacyFront: string = '';

  privacy: TypePrivacy = TypePrivacy.PUBLIC;

  typePrivacy = TypePrivacy;

  decodedToken!: Token;

  isAuthenticated: boolean = false;

  typePublishing = TypePublishing;

  public myForm: FormGroup = this._fb.group({
    content: ['', [Validators.required, Validators.minLength(1)]],
    privacy: [''],
    authorId: [''],
    extraData: [''],
   });

  @Input() type: TypePublishing | undefined;

  @Input() idPublication?: string;

  @Input() indexPublication?: number;

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
    ) { 
    this.isAuthenticated = this._authService.isAuthenticated();
    if (this.isAuthenticated) {
      this.decodedToken = this._authService.getDecodedToken();
      this.userName = this.decodedToken.name;
    }
    }

  // eslint-disable-next-line @angular-eslint/no-empty-lifecycle-method
  ngOnInit() {
    this.postPrivacy(TypePrivacy.PUBLIC)
  }

  ngAfterViewInit() {
    this.autoResize();
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

    if (this.type === TypePublishing.POST){
      this.onSavePublication();
    }
    if (this.type === TypePublishing.COMMENT){
      this.onSaveComment(this.idPublication as string);
    }

  }

  private async onSaveComment(idPublication: string) {
    const loadingComment = await this._loadingCtrl.create({
      message: translations['addPublication.loadingCommentMessage'],
    });

    loadingComment.present();

    const dataComment: CreateComment = {
      content: this.myForm.controls['content'].value,
      authorId: this.decodedToken.id,
      idPublication: idPublication,
    };

    this._commentService.createComment(dataComment).subscribe({
      next: async (message: any) => {
        const publications = await this._publicationService.getAllPublications(1, 10);
        publications[this.indexPublication!].comment.unshift(message.comment);
        this._publicationService.publicationsSubject.next(publications);

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
            authorPublicationId: publications[this.indexPublication!].author._id,
          });
        }
      },
      error: (error) => {
        console.error(error);
      },
      complete: () => {
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

    this._publicationService.createPost(this.myForm.value).subscribe({
      next: async (message: any) => {
        const publicationsNew = await this._publicationService.publicationsSubject.getValue();
        publicationsNew.unshift(message.publications);
        this._publicationService.publicationsSubject.next(publicationsNew);

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
      },
      error: (error) => {
        console.error(error);
      },
      complete: () => {
        loadingPublications.dismiss();
      }
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

        //const urlMap = 'https://www.google.com/maps/place/' + result.formatted.split(',')[0];
        const urlMap = `https://www.google.com/maps/?q=${result.formatted}&ll=${lat},${lng}`;
        this.dataGeoLocation = urlMap;
        this.nameGeoLocation = result.formatted.split(',')[0];
        this._cdr.markForCheck();
      }
    });
  }

}
