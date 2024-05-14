import { Component, Input, OnInit } from '@angular/core';
import { PublicationView } from '../../shared/interfaces/publicationView.interface';

@Component({
  selector: 'worky-publication-view',
  templateUrl: './publication-view.component.html',
  styleUrls: ['./publication-view.component.scss'],
})
export class PublicationViewComponent  implements OnInit {
  @Input() publication: PublicationView | undefined;

  constructor() { }

  // eslint-disable-next-line @angular-eslint/no-empty-lifecycle-method
  ngOnInit() {
  }

}
