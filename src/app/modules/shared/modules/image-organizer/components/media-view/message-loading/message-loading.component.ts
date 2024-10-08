import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Comment, PublicationView } from '@shared/interfaces/publicationView.interface';
import { ImageOrganizer } from '@shared/modules/image-organizer/interfaces/image-organizer.interface';

@Component({
  selector: 'worky-message-loading',
  templateUrl: './message-loading.component.html',
  styleUrls: ['./message-loading.component.scss'],
})
export class MessageLoadingComponent  implements OnChanges {

  @Input() images: ImageOrganizer[] = [];

  @Input() publication?: PublicationView;

  @Input() type?: string | undefined;

  @Input() comment?: Comment;

  @Input() imgSelected?: string;

  constructor() { }

  ngOnChanges(changes: SimpleChanges) {}

}
