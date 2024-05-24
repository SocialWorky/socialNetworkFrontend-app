import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LoadingController } from '@ionic/angular';

import { PublicationView } from '@shared/interfaces/publicationView.interface';
import { TypePublishing } from '../addPublication/enum/addPublication.enum';
import { DropdownDataLink } from '../worky-dropdown/interfaces/dataLink.interface';
import { AuthService } from '@auth/services/auth.service';
import { RoleUser } from '@auth/models/roleUser.enum';
import { PublicationService } from '@shared/services/publication.service';
import { environment } from '@env/environment';
@Component({
  selector: 'worky-publication-view',
  templateUrl: './publication-view.component.html',
  styleUrls: ['./publication-view.component.scss'],
})
export class PublicationViewComponent  implements OnInit, OnDestroy {

  @Input() publication: PublicationView | undefined;

  @Input() indexPublication?: number;

  typePublishing = TypePublishing;

  dataLinkActions:DropdownDataLink<any>[] = [];

  dataShareActions:DropdownDataLink<any>[] = [];

  viewCommentSection: number | null = null;

  viewComments: number | null = null;

  dataUser = this._authService.getDecodedToken();

  private subscription: Subscription = new Subscription();

  constructor(
    private _router: Router,
    private _cdr: ChangeDetectorRef,
    private _authService: AuthService,
    private _loadingCtrl: LoadingController,
    private _publicationService: PublicationService
  ) {}

  // eslint-disable-next-line @angular-eslint/no-empty-lifecycle-method
  ngOnInit() {
    this.menuActions();
    this.menuShareActions();
    this._cdr.markForCheck();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  commentOn(index: number) {
    if (this.viewCommentSection === index) {
        this.viewCommentSection = -1;
    } else {
        this.viewCommentSection = index;
    }
  }

  viewCommentsOn(index: number) {
    if (this.viewComments === index) {
        this.viewComments = -1;
    } else {
        this.viewComments = index;
    }
  }

  checkDataLink(userId: string) {

    const menuDeletePublications = { icon:'delete' ,function: this.deletePublications.bind(this),  title: 'Eliminar Publicacion'};

    if (userId === this.dataUser.id || this.dataUser.role === RoleUser.ADMIN){

      if (!this.dataLinkActions.find((element) => element.title === 'Eliminar Publicacion')){
        this.dataLinkActions.push(menuDeletePublications);
      }

    }
  }
  menuActions() {
    this.dataLinkActions = [
      { icon:'report', link: '/auth/login',  title: 'Reportar Publicación' },
    ];
  }

    menuShareActions() {
    const url = environment.BASE_URL;
    this.dataShareActions = [
      { 
        img:'assets/img/logos/facebook.svg',
        linkUrl: `https://web.facebook.com/sharer.php?u=${url}`,
        title: 'Facebook'
      },
      {
        img:'assets/img/logos/twitter_x.svg',
        linkUrl: `https://twitter.com/intent/tweet?url=${url}`,
        title: 'Twitter'
      },
      {
        img:'assets/img/logos/linkedin.svg',
        linkUrl: `https://www.linkedin.com/shareArticle?url=${url}`,
        title: 'Linkedin'
      },
      {
        img:'assets/img/logos/whatsapp.svg',
        linkUrl: `whatsapp://send?text=${url}`,
        title: 'Whatsapp'
      },
    ];
  }

  async deletePublications(publication: PublicationView) {

    const loadingComment = await this._loadingCtrl.create({
      message: 'Eliminando publicación...',
    });

    loadingComment.present();

    this.subscription.add(
      this._publicationService.deletePublication(publication._id).subscribe({
        next: async () => {
          const publications = await this._publicationService.getAllPublications(1, 10);
          this._publicationService.publicationsSubject.next(publications);
          loadingComment.dismiss();
        },
        error: (error) => {
          console.error(error);
          loadingComment.dismiss();
        },
      })
    );
  }

  handleActionsClicked(data: DropdownDataLink<any>, publication: any) {
    if (data.function) {
      if (typeof data.function === 'function') {
        data.function(publication); // Remove the 'publication' parameter from the function call
      }
    }
    if (data.link) {
      this._router.navigate([data.link]);
    }
    if (data.linkUrl) {
      const newLink = data.linkUrl + '/publication/' + publication._id;
      window.open(newLink, '_blank');
    }
  }

}
