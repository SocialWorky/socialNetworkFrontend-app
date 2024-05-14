import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LoadingController } from '@ionic/angular';
import { WorkyButtonType, WorkyButtonTheme } from '../../shared/buttons/models/worky-button-model';
import { AuthService } from '../../auth/services/auth.service';
import { PublicationService } from '../services/publication.service';
import { CommentService } from '../services/comment.service';
import { translations } from '../../../../translations/translations';
import { TypePublishing, TypePrivacy } from './enum/addPublication.enum';
import { Token } from '../interfaces/token.interface';
import { AlertService } from '../../shared/services/alert.service';
import { Alerts, Position } from '../../shared/enums/alerts.enum';
import { CreateComment} from '../interfaces/addComment.interface';

@Component({
  selector: 'worky-add-publication',
  templateUrl: './addPublication.component.html',
  styleUrls: ['./addPublication.component.scss'],
})
export class AddPublicationComponent  implements OnInit {
  WorkyButtonType = WorkyButtonType;

  WorkyButtonTheme = WorkyButtonTheme;

  userName: string = '';

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
      message: 'Estamos publicando tu comentario, por favor espera un momento',
    });

    loadingComment.present();

    const dataComment: CreateComment = {
      content: this.myForm.controls['content'].value,
      authorId: this.decodedToken.id,
      idPublication: idPublication,
    };

    this._commentService.createComment(dataComment).subscribe({
      next: (message: any ) => {

        const publications = this._publicationService.publicationsSubject.getValue();

        publications[this.indexPublication!].comment.push(message.comment);

        this._publicationService.publicationsSubject.next(publications);

        if (message.message === 'Comment created successfully') {
          this.myForm.controls['content'].setValue('');
          this.autoResize();
          this._alertService.showAlert(
            'Comentario exitoso',
            'Se ha comentado correctamente, gracias por participar',
            Alerts.SUCCESS,
            Position.CENTER,
            true,
            true,
            translations['button.ok'],
          );
          loadingComment.dismiss();
        }
      },
      error: (error) => {
        console.error(error);
      }
    });
    loadingComment.dismiss();
  }

  private async onSavePublication() {

    const loadingPublications = await this._loadingCtrl.create({
      message: 'Estamos publicando tu contenido, por favor espera un momento',
    });

    loadingPublications.present();

    this._publicationService.createPost(this.myForm.value).subscribe({
      next: (message: any ) => {

        const publicationsNew = this._publicationService.publicationsSubject.getValue();

        publicationsNew.push(message.publications);

        this._publicationService.publicationsSubject.next(publicationsNew);

        if (message.message === 'Publication created successfully'){
          this.myForm.controls['content'].setValue('');
          this.autoResize();
          this._alertService.showAlert(
            'Publicacion exitosa',
            'Se ha publicado correctamente, gracias por compartir',
            Alerts.SUCCESS,
            Position.CENTER,
            true,
            true,
            translations['button.ok'],
          );
          loadingPublications.dismiss();
        }
      },
      error: (error) => {
        console.error(error);
      }
    });
    loadingPublications.dismiss();
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

}
