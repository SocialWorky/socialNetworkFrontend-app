import { AfterViewInit, ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LoadingController } from '@ionic/angular';

import { PublicationView } from '@shared/interfaces/publicationView.interface';
import { TypePrivacy, TypePublishing } from '../addPublication/enum/addPublication.enum';
import { DropdownDataLink } from '../worky-dropdown/interfaces/dataLink.interface';
import { AuthService } from '@auth/services/auth.service';
import { RoleUser } from '@auth/models/roleUser.enum';
import { PublicationService } from '@shared/services/publication.service';
import { environment } from '@env/environment';
import { FriendsService } from '@shared/services/friends.service';
import { translations } from '@translations/translations';
import { FriendsStatus, UserData } from '@shared/interfaces/friend.interface';


@Component({
  selector: 'worky-publication-view',
  templateUrl: './publication-view.component.html',
  styleUrls: ['./publication-view.component.scss'],
})
export class PublicationViewComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() publication: PublicationView | undefined;

  @Input() indexPublication?: number;

  typePublishing = TypePublishing;

  typePrivacy = TypePrivacy;

  dataLinkActions: DropdownDataLink<any>[] = [];

  dataShareActions: DropdownDataLink<any>[] = [];

  viewCommentSection: number | null = null;

  viewComments: number | null = null;

  nameGeoLocation: string = '';

  urrMap: string = '';

  extraData: string[] = [];

  userRequest?: UserData;
  
  userReceive?: UserData;

  routeUrl: string = '';

  isProfile: boolean = false;

  dataUser = this._authService.getDecodedToken();

  private destroy$ = new Subject<void>();

  constructor(
    private _router: Router,
    private _cdr: ChangeDetectorRef,
    private _authService: AuthService,
    private _loadingCtrl: LoadingController,
    private _publicationService: PublicationService,
    private _friendsService: FriendsService,
  ) {}
  async ngAfterViewInit() {
    await this.getUserFriendPending();
  }

  async ngOnInit() {
    await this.userReceive;
    this.menuActions();
    this.menuShareActions();
    this.extraDataPublication();
    this.routeUrl = this._router.url;
    if (this.routeUrl.includes('profile')) {
      this.isProfile = true;
    } else {
      this.isProfile = false;
    }
    this.getUserFriendPending();
    this._cdr.markForCheck();
  }



  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  extraDataPublication() {
    try {
      const extraData = this.publication?.extraData ? JSON.parse(this.publication.extraData as any) : {};
      if (extraData) {
        this.nameGeoLocation = extraData.locations?.title || '';
        this.urrMap = extraData.locations?.urlMap || '';
      }
    } catch (e) {
      console.error('Error in file JSON: ', e);
      this.nameGeoLocation = '';
      this.urrMap = '';
    }
  }

  commentOn(index: number) {
    this.viewCommentSection = this.viewCommentSection === index ? -1 : index;
  }

  viewCommentsOn(index: number) {
    this.viewComments = this.viewComments === index ? -1 : index;
  }

  checkDataLink(userId: string) {
    const menuDeletePublications = { icon: 'delete', function: this.deletePublications.bind(this), title: translations['publicationsView.deletePublication'] };

    if (userId === this.dataUser.id || this.dataUser.role === RoleUser.ADMIN) {
      if (!this.dataLinkActions.find((element) => element.title === translations['publicationsView.deletePublication'])) {
        this.dataLinkActions.push(menuDeletePublications);
      }
    }
  }

  menuActions() {
    this.dataLinkActions = [
      { icon: 'report', link: '/auth/login', title: translations['publicationsView.reportPublication'] },
    ];
  }

  menuShareActions() {
    const url = environment.BASE_URL;
    this.dataShareActions = [
      {
        img: 'assets/img/logos/facebook.svg',
        linkUrl: `https://web.facebook.com/sharer.php?u=${url}`,
        title: 'Facebook'
      },
      {
        img: 'assets/img/logos/twitter_x.svg',
        linkUrl: `https://twitter.com/intent/tweet?url=${url}`,
        title: 'Twitter'
      },
      {
        img: 'assets/img/logos/linkedin.svg',
        linkUrl: `https://www.linkedin.com/shareArticle?url=${url}`,
        title: 'Linkedin'
      },
      {
        img: 'assets/img/logos/whatsapp.svg',
        linkUrl: `whatsapp://send?text=${url}`,
        title: 'Whatsapp'
      },
    ];
  }

  async deletePublications(publication: PublicationView) {
    const loadingDeletePublication = await this._loadingCtrl.create({
      message: translations['publicationsView.loadingDeletePublication'],
    });

    loadingDeletePublication.present();

    this._publicationService.deletePublication(publication._id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: async () => {
        const publications = await this._publicationService.getAllPublications(1, 10);
        this._publicationService.updatePublications(publications);
        loadingDeletePublication.dismiss();
      },
      error: (error) => {
        console.error(error);
        loadingDeletePublication.dismiss();
      },
    });
  }

  handleActionsClicked(data: DropdownDataLink<any>, publication: any) {
    if (data.function && typeof data.function === 'function') {
      data.function(publication);
    } else if (data.link) {
      this._router.navigate([data.link]);
    } else if (data.linkUrl) {
      const newLink = data.linkUrl + '/publication/' + publication._id + '/';
      window.open(newLink, '_blank');
    }
  }

  async followMyFriend(_id: string) {
    await this._friendsService.requestFriend(_id).subscribe({
      next: async () => {
        const refreshPublications = await this._publicationService.getAllPublications(1, 10);
        this._publicationService.updatePublications(refreshPublications);
        this._cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error the send request', error);
      }
    });
  }

  cancelFriendship(_id: string) {
    this._friendsService.deleteFriend(_id).subscribe({
      next: async (data) => {
        const refreshPublications = await this._publicationService.getAllPublications(1, 10);
        this._publicationService.updatePublications(refreshPublications);
        this._cdr.markForCheck();
      }
    });
  }

  async getUserFriendPending() {
    await this._friendsService.getIsMyFriend(this._authService.getDecodedToken().id, this.publication?.author?._id || '').subscribe({
      next: (response: FriendsStatus) => {
        this.userRequest = response?.requester;
        this.userReceive = response?.receiver;
        this._cdr.markForCheck();
      },
      error: (error: any) => {
        console.error(error);
      },
    });
  }

  acceptFriendship(_id: string) {
    this._friendsService.acceptFriendship(_id).subscribe({
      next: async (data) => {
        this.getUserFriendPending();
        const refreshPublications = await this._publicationService.getAllPublications(1, 10);
        this._publicationService.updatePublications(refreshPublications);
        this._cdr.markForCheck();
      }
    });
  }

  viewProfile(_id: string) {
    this._router.navigate(['/profile', _id]);
  }

}
