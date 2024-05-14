import { Component, Input, OnInit } from '@angular/core';
import { PublicationView } from '../../shared/interfaces/publicationView.interface';
import { TypePublishing } from '../addPublication/enum/addPublication.enum';

@Component({
  selector: 'worky-publication-view',
  templateUrl: './publication-view.component.html',
  styleUrls: ['./publication-view.component.scss'],
})
export class PublicationViewComponent  implements OnInit {

  @Input() publication: PublicationView | undefined;

  @Input() indexPublication?: number;

  typePublishing = TypePublishing;

  viewCommentSection: number | null = null;

  viewComments: number | null = null;

  constructor() { }

  // eslint-disable-next-line @angular-eslint/no-empty-lifecycle-method
  ngOnInit() {
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

}
