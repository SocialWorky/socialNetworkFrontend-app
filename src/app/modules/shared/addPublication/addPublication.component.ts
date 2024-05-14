import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LoadingController } from '@ionic/angular';
import { WorkyButtonType, WorkyButtonTheme } from '../../shared/buttons/models/worky-button-model';
import { AuthService } from '../../auth/services/auth.service';
import { PublicationService } from '../services/publication.service';
import { translations } from '../../../../translations/translations';
import { TypePublishing, TypePrivacy } from './enum/addPublication.enum';
import { Token } from '../interfaces/token.interface';
import { AlertService } from '../../shared/services/alert.service';
import { Alerts, Position } from '../../shared/enums/alerts.enum';

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

  public myForm: FormGroup = this._fb.group({
    content: ['', [Validators.required, Validators.minLength(1)]],
    privacy: [''],
    authorId: [''],
   });

  @Input() type: TypePublishing | undefined;

  @ViewChild('postText') postTextRef!: ElementRef;
  
  constructor(
      private _fb: FormBuilder,
      private _authService: AuthService,
      private _publicationService: PublicationService,
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

  async onSavePost() {

    const loading = await this._loadingCtrl.create({
      message: 'Estamos publicando tu contenido, por favor espera un momento',
    });

    loading.present();

    this.myForm.controls['authorId'].setValue(this.decodedToken.id);
    this.myForm.controls['privacy'].setValue(this.privacy);
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
          loading.dismiss();
        }
      },
      error: (error) => {
        console.error(error);
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

}
