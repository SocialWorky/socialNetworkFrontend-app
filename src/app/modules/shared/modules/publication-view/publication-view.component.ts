import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { distinctUntilChanged, takeUntil, debounceTime } from 'rxjs/operators';
import { LoadingController } from '@ionic/angular';
import { MatDialog } from '@angular/material/dialog';
import * as _ from 'lodash';

import { PublicationView } from '@shared/interfaces/publicationView.interface';
import { TypePrivacy, TypePublishing } from '../addPublication/enum/addPublication.enum';
import { DropdownDataLink } from '../worky-dropdown/interfaces/dataLink.interface';
import { AuthService } from '@auth/services/auth.service';
import { RoleUser } from '@auth/models/roleUser.enum';
import { PublicationService } from '@shared/services/core-apis/publication.service';
import { environment } from '@env/environment';
import { FriendsService } from '@shared/services/core-apis/friends.service';
import { translations } from '@translations/translations';
import { FriendsStatus, UserData } from '@shared/interfaces/friend.interface';
import { ReportsService } from '@shared/services/core-apis/reports.service';
import { ReportCreate } from '@shared/interfaces/report.interface';
import { ReportType, ReportStatus } from '@shared/enums/report.enum';
import { ReportResponseComponent } from '../publication-view/report-response/report-response.component';
import { EmailNotificationService } from '@shared/services/notifications/email-notification.service';
import { CommentService } from '@shared/services/core-apis/comment.service';
import { NotificationService } from '@shared/services/notifications/notification.service';
import { Reactions } from './interfaces/reactions.interface';
import { Colors } from '@shared/interfaces/colors.enum';
import { ScrollService } from '@shared/services/scroll.service';
import { Token } from '@shared/interfaces/token.interface';
import { LoadingService } from '@shared/services/loading.service';
import { ImageLoadOptions } from '../../services/image.service';

@Component({
    selector: 'worky-publication-view',
    templateUrl: './publication-view.component.html',
    styleUrls: ['./publication-view.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class PublicationViewComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() publication!: PublicationView;

  @Input() indexPublication?: number;

  @Input() type?: TypePublishing;

  @Input() userProfile?: string;

  typePublishing = TypePublishing;

  typePrivacy = TypePrivacy;

  emojiImageOptions: ImageLoadOptions = {
    maxRetries: 1,
    retryDelay: 300,
    timeout: 3000,
    fallbackUrl: '/assets/images/emoji-placeholder.png'
  };

  dataLinkActions: DropdownDataLink<any>[] = [];

  dataShareActions: DropdownDataLink<any>[] = [];

  viewCommentSection: number | null = null;

  viewComments: number | null = null;

  nameGeoLocation = '';

  urrMap = '';

  extraData: string[] = [];

  userRequest?: UserData;

  userReceive?: UserData;

  routeUrl = '';

  isProfile = false;

  dataUser: Token | null = null;

  listReaction: string[] = [];

  isCodeBlock(content: string): boolean {
    return content.trim().startsWith('```');
  }

  private destroy$ = new Subject<void>();

  constructor(
    private _router: Router,
    private _cdr: ChangeDetectorRef,
    private _authService: AuthService,
    private _loadingCtrl: LoadingController,
    private _publicationService: PublicationService,
    private _commentService: CommentService,
    private _friendsService: FriendsService,
    private _reportsService: ReportsService,
    public _dialog: MatDialog,
    private _emailNotificationService: EmailNotificationService,
    private _notificationService: NotificationService,
    private _scrollService: ScrollService,
    private _loadingService: LoadingService
  ) {}

  async ngAfterViewInit() {
    this.getUserFriendPending();
  }

  ngOnInit() {
    this.dataUser = this._authService.getDecodedToken();
    this.getUserFriendPending();
    this.menuShareActions();
    this.extraDataPublication();
    this.routeUrl = this._router.url;
    this.isProfile = this.routeUrl.includes('profile');

          this._notificationService.notification$
        .pipe(
          distinctUntilChanged((prev, curr) => _.isEqual(prev, curr)),
          debounceTime(300),
          takeUntil(this.destroy$)
        )
      .subscribe({
        next: (data: any) => {
          if (data?._id === this.publication._id) {
            this.updatePublicationIfNeeded(data);
          }
        }
      });
    this.loadReactionsImg();
    this._cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadReactionsImg(publication: PublicationView = this.publication){
    this.listReaction = [];
    if (publication) {
      publication.reaction.forEach((element: Reactions) => {
        if(this.listReaction.includes(element.customReaction.emoji)) return;
        this.listReaction.push(element.customReaction.emoji);
        this._cdr.markForCheck();
      });
    }
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
    this.dataLinkActions = [];
    this.menuActions();
    const menuDeletePublications = {
      icon: 'delete',
      function: this.deletePublications.bind(this),
      title: translations['publicationsView.deletePublication']
    };
    const menuFixedPublications = {
      icon: 'push_pin',
      function: this.fixedPublications.bind(this),
      title: !this.publication.fixed ? translations['publicationsView.fixedPublication'] : translations['publicationsView.unfixedPublication']
    };

    if (userId === this.dataUser?.id || this.dataUser?.role === RoleUser.ADMIN) {

      if (this.publication.fixed) {
        if (!this.dataLinkActions.find((element) => element.title === translations['publicationsView.unfixedPublication'])) {
          this.dataLinkActions.push(menuFixedPublications);
        }
      } else {
        if (!this.dataLinkActions.find((element) => element.title === translations['publicationsView.fixedPublication'])) {
          this.dataLinkActions.push(menuFixedPublications);
        }
      }

      if (!this.dataLinkActions.find((element) => element.title === translations['publicationsView.deletePublication'])) {
        this.dataLinkActions.push(menuDeletePublications);
      }
    }
    this._cdr.markForCheck();
  }

  menuActions() {
    this.dataLinkActions = [
      { icon: 'report', function: this.createReport.bind(this), title: translations['publicationsView.reportPublication'] },
    ];
  }

  menuShareActions() {
    const url = environment.BASE_URL;
    this.dataShareActions = [
      {
        img: 'assets/img/logos/svg-facebook.svg',
        linkUrl: `https://web.facebook.com/sharer.php?u=${url}`,
        title: translations['social.facebook']
      },
      {
        img: 'assets/img/logos/twitter-x.svg',
        linkUrl: `https://twitter.com/intent/tweet?url=${url}`,
        title: translations['social.twitter']
      },
      // TODO: Uncomment when the linkedin share is ready
      // {
      //   img: 'assets/img/logos/linkedin.svg',
      //   linkUrl: `https://www.linkedin.com/shareArticle?url=${url}`,
      //   title: translations['social.linkedin']
      // },
      {
        img: 'assets/img/logos/svg-whatsapp.svg',
        linkUrl: `whatsapp://send?text=${url}`,
        title: translations['social.whatsapp']
      },
    ];
  }

  async deletePublications(publication: PublicationView) {
    // Usar el nuevo sistema de loading accesible
    const loading = await this._loadingService.showLoading(translations['publicationsView.loadingDeletePublication']);

    this._publicationService.deletePublication(publication._id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this._publicationService.updatePublicationsDeleted([publication]);
        this._loadingService.hideLoading();
      },
      error: (error) => {
        console.error(error);
        this._loadingService.hideLoading();
      },
    });
  }

  async fixedPublications(publication: PublicationView) {
    // Usar el nuevo sistema de loading accesible
    const loading = await this._loadingService.showLoading(
      !publication.fixed ? translations['publicationsView.loadingFixedPublication'] : translations['publicationsView.loadingUnfixedPublication']
    );

    this._publicationService.updatePublicationById(publication._id, { fixed: !publication.fixed }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.refreshPublications(publication._id);
        this._loadingService.hideLoading();
        this._scrollService.scrollToTop();
      },
      error: (error) => {
        console.error(error);
        this._loadingService.hideLoading();
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

  async followMyFriend(_idUser: string) {
    this._friendsService.requestFriend(_idUser).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this._emailNotificationService.sendFriendRequestNotification(_idUser);
        this.viewProfile(_idUser);
      },
      error: (error) => {
        console.error('Error the send request', error);
      }
    });
  }

  cancelFriendship(_id: string, authorId: string) {
    this._friendsService.deleteFriend(_id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.viewProfile(authorId);
      }
    });
  }

  getUserFriendPending() {
    this._friendsService.getIsMyFriend(this.dataUser?.id!, this.publication?.author?._id || '').pipe(takeUntil(this.destroy$)).subscribe({
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

  acceptFriendship(_id: string, idUser: string) {
    this._friendsService.acceptFriendship(_id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.getUserFriendPending();
        this._emailNotificationService.acceptFriendRequestNotification(idUser);
        this.viewProfile(idUser);
      }
    });
  }

  viewProfile(_id: string) {
    this._router.navigate(['/profile', _id]);
  }

  refreshPublications(_id?: string) {
    if (_id) {
      this._publicationService.getPublicationId(_id).pipe(
        takeUntil(this.destroy$),
        debounceTime(200)
      ).subscribe({
        next: (publication: PublicationView[]) => {
          if (!publication.length) {
            return;
          }
          
          const updatedPublication = publication[0];
          
          if (JSON.stringify(this.publication) !== JSON.stringify(updatedPublication)) {
            this._publicationService.updatePublicationsLocal(publication);
            this.publication = updatedPublication;
            this.loadReactionsImg(updatedPublication);
            this.checkDataLink(updatedPublication._id);
            this._cdr.markForCheck();
          }
        },
        error: (error) => {
          console.error('Failed to refresh publications', error);
        }
      });
    }
  }

  createReport(publication: PublicationView) {
    this.openUploadModal(publication);
  }

  async openUploadModal(publication: PublicationView) {
    const dialogRef = this._dialog.open(ReportResponseComponent, {});
    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(async (result: any) => {
      if (result) {
        const loading = await this._loadingService.showLoading(translations['shared.reportResponse.title']);

        const report: ReportCreate = {
          type: ReportType.POST,
          _idReported: publication._id,
          reporting_user: this.dataUser?.id!,
          status: ReportStatus.PENDING,
          detail_report: result,
        };
        this._reportsService.createReport(report).pipe(takeUntil(this.destroy$)).subscribe({
          next: (data) => {
            this._loadingService.hideLoading();
            this._emailNotificationService.sendEmailNotificationReport(publication, result);
            this._cdr.markForCheck();
          },
          error: (error) => {
            console.error('Error creating report:', error);
            this._loadingService.hideLoading();
          }
        });
      }
    });
  }

  async deleteComment(_id: string, id_publication: string) {
    const loading = await this._loadingService.showLoading(translations['publicationsView.loadingDeletePublication']);

    this._commentService.deleteComment(_id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.refreshPublications(id_publication);
        this._loadingService.hideLoading();
      },
      error: (error) => {
        console.error('Error deleting comment:', error);
        this._loadingService.hideLoading();
      }
    });
  }

  onEmojiError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  private updatePublicationIfNeeded(updatedData: any) {
    const hasRelevantChanges = 
      this.publication.reaction.length !== updatedData.reaction?.length ||
      this.publication.comment.length !== updatedData.comment?.length ||
      this.publication.fixed !== updatedData.fixed ||
      JSON.stringify(this.publication.reaction) !== JSON.stringify(updatedData.reaction);

    if (hasRelevantChanges) {
      this.refreshPublications(updatedData._id);
      this.loadReactionsImg(updatedData);
      this._cdr.markForCheck();
    }
  }
}
