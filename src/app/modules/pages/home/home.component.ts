import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { TypePublishing } from '../../shared/addPublication/enum/addPublication.enum';
import { PublicationView } from '../../shared/interfaces/publicationView.interface';
import { Subscription } from 'rxjs';
import { PublicationService } from '../../shared/services/publication.service';
import { NotificationCommentService } from '../../shared/services/notificationComment.service';
import { AuthService } from '../../auth/services/auth.service';
import { AlertService } from '../../shared/services/alert.service';
import { Alerts, Position } from '../../shared/enums/alerts.enum';

@Component({
  selector: 'worky-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit, OnDestroy {

  private subscription: Subscription = new Subscription();

  typePublishing = TypePublishing;

  publications:PublicationView[]= [];

  constructor(
    private _publicationService: PublicationService,
    private _cdr: ChangeDetectorRef,
    private _notificationCommentService: NotificationCommentService,
    private _authService: AuthService,
    private _alertService: AlertService,
  ) {}

  subscribeToNotificationComment() {
    this.subscription.add(this._notificationCommentService.notificationComment$.subscribe((data: any) => {
      if (data.authorPublicationId === this._authService.getDecodedToken().id) {  
          const message = `Nuevo comentario en tu publicación`;
          this._alertService.showAlert('notificacion', message, Alerts.SUCCESS, Position.CENTER,);
        return;
      }    
     })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    if (this._notificationCommentService) {
      this._notificationCommentService.ngOnDestroy();
    }
  }
  async ngOnInit() {
    await this._publicationService.getAllPublications(); // Espera a que se obtengan todas las publicaciones
    this.subscription.add(this._publicationService.publications$.subscribe(publicationsData => {
      this.publications = publicationsData;
      this._cdr.detectChanges();
    }));
    this.subscribeToNotificationComment();
  }


}
