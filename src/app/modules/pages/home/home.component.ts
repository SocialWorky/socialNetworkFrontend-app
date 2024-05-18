import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { TypePublishing } from '../../shared/addPublication/enum/addPublication.enum';
import { PublicationView } from '../../shared/interfaces/publicationView.interface';
import { Subscription } from 'rxjs';
import { PublicationService } from '../../shared/services/publication.service';
import { NotificationCommentService } from '../../shared/services/notificationComment.service';
import { AuthService } from '../../auth/services/auth.service';
import { AlertService } from '../../shared/services/alert.service';
import { Alerts, Position } from '../../shared/enums/alerts.enum';
import { translations } from '../../../../translations/translations';

@Component({
  selector: 'worky-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit, OnDestroy {

  private subscription: Subscription = new Subscription();

  typePublishing = TypePublishing;

  publications:PublicationView[]= [];

  page = 1;

  pageSize = 10;

  loaderPublications?: boolean;

  constructor(
    private _publicationService: PublicationService,
    private _cdr: ChangeDetectorRef,
    private _notificationCommentService: NotificationCommentService,
    private _authService: AuthService,
    private _alertService: AlertService,
  ) {}

async subscribeToNotificationComment() {
  this.subscription.add(this._notificationCommentService.notificationComment$.subscribe(async (data: any) =>  {
    // if (data.authorPublicationId === this._authService.getDecodedToken().id) { 
    //   const message = `Nuevo comentario en tu publicación`;
    //   this._alertService.showAlert('notificacion', message, Alerts.SUCCESS, Position.CENTER);
    //   return;
    // }
    const newCommentInPublications = await this._publicationService.getAllPublications(this.page, this.pageSize);
    this._publicationService.publicationsSubject.next(newCommentInPublications);
  }));
}

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    if (this._notificationCommentService) {
      this._notificationCommentService.ngOnDestroy();
    }
  }
  async ngOnInit() {
    this.loaderPublications = true;
    await this._publicationService.getAllPublications(this.page, this.pageSize);
    this.subscription.add(this._publicationService.publications$.subscribe({
      next: (publicationsData: PublicationView[]) => {
      this.loaderPublications = false;
      this.publications = publicationsData;
      this._cdr.markForCheck();
      },
      error: (error) => {
        console.error( translations['home.errorGetPublications'], error);
      }
    })
    );
    this.subscribeToNotificationComment();
  }

}
