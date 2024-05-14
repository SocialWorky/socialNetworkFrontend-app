import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { TypePublishing } from '../../shared/addPublication/enum/addPublication.enum';
import { PublicationView } from '../../shared/interfaces/publicationView.interface';
import { Subscription } from 'rxjs';
import { PublicationService } from '../../shared/services/publication.service';

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
    private _cdr: ChangeDetectorRef
  ) {}
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
  async ngOnInit() {
    await this._publicationService.getAllPublications();
    this.subscription.add(this._publicationService.publications$.subscribe(publicationsData => {
      this.publications = publicationsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      this._cdr.detectChanges();
    }));
  }


}
