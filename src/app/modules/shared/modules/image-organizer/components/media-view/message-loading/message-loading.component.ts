import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Comment, PublicationView } from '@shared/interfaces/publicationView.interface';
import { ImageOrganizer } from '@shared/modules/image-organizer/interfaces/image-organizer.interface';
import { signal } from '@angular/core';

@Component({
  selector: 'worky-message-loading',
  templateUrl: './message-loading.component.html',
  styleUrls: ['./message-loading.component.scss'],
})
export class MessageLoadingComponent  implements OnChanges {

  @Input() images: ImageOrganizer[] = [];

  @Input() imgSelected?: string;

  @Input() set publication(value: PublicationView | undefined) {
    this.publications.set(value ? [value] : []);
  }

  @Input() set comment(value: Comment | undefined) {
    this.comments.set(value ? [value] : []);
  }

  @Input() type?: string;

  publications = signal<PublicationView[]>([]);
  comments = signal<Comment[]>([]);

  constructor() { }

  ngOnChanges(changes: SimpleChanges) {}

}
