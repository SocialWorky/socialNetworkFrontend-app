import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';

import { CustomReactionsService } from '@admin/shared/manage-reactions/service/customReactions.service';
import { CustomReactionList } from '@admin/interfaces/customReactions.interface';
import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';
import { ReactionsService } from '@shared/services/reactions.service';
import { AuthService } from '@auth/services/auth.service';
import { PublicationService } from '@shared/services/publication.service';
import { PublicationsReactions } from '@shared/interfaces/reactions.interface';

@Component({
  selector: 'worky-reactions',
  templateUrl: './reactions.component.html',
  styleUrls: ['./reactions.component.scss'],
})
export class ReactionsComponent implements OnInit {
  reactionsVisible = false;

  reactions: Array<CustomReactionList & { zoomed: boolean }> = [];

  typePublishing = TypePublishing;

  @Input() type: TypePublishing | undefined;

  @Input() idPublication: string | undefined;

  @Input() reactionsToPublication: PublicationsReactions[] = [];

  token = this._authService.getDecodedToken();

  get reactionUserInPublication() {
    return this.reactionsToPublication.find((reaction) => reaction.user._id === this.token.id);
  }

  constructor(
    private _customReactionsService: CustomReactionsService,
    private _cdr: ChangeDetectorRef,
    private _reactionsService: ReactionsService,
    private _authService: AuthService,
    private _publicationService: PublicationService,
  ) {}

  ngOnInit() {
    this.loadReactions();
  }

  addReaction(reaction: CustomReactionList) {

    if (this.reactionUserInPublication) {
      this.editReaction(this.reactionUserInPublication._id, reaction);
      return;
    }

    console.log('this.token.id', this.token.id);
    this._reactionsService
      .createReaction({
        authorId: this.token.id,
        _idCustomReaction: reaction._id,
        isPublications: this.type === TypePublishing.POST ? true : false,
        isComment: this.type === TypePublishing.COMMENT ? true : false,
        _idPublication: this.idPublication!,
      })
      .subscribe({
        next: async (reaction) => {
          this.reactionsVisible = false;
          const publicationsNew = await this._publicationService.getAllPublications(1, 10);
          this._publicationService.updatePublications(publicationsNew);
        },
        error: (err) => {
          console.error('Failed to add reaction', err);
        }
      });
  }

  deleteReaction(idReaction: string) {
    this._reactionsService.deleteReaction(idReaction).subscribe({
      next: async () => {
        const publicationsNew = await this._publicationService.getAllPublications(1, 10);
        this._publicationService.updatePublications(publicationsNew);
      },
      error: (err) => {
        console.error('Failed to delete reaction', err);
      }
    });
  }

  editReaction(id: string, reaction: CustomReactionList) {
    console.log('idReaction', id);
    console.log('reaction edit', reaction);
    this._reactionsService.editReaction(id, {
      authorId: this.token.id,
      _idCustomReaction: reaction._id,
      isPublications: this.type === TypePublishing.POST ? true : false,
      isComment: this.type === TypePublishing.COMMENT ? true : false,
      _idPublication: this.idPublication!,
    }).subscribe({
      next: async (data) => {
        console.log('data', data);
        const publicationsNew = await this._publicationService.getAllPublications(1, 10);
        this._publicationService.updatePublications(publicationsNew);
      },
      error: (err) => {
        console.error('Failed to edit reaction', err);
      }
    });
  }

  loadReactions() {
    this._customReactionsService.getCustomReactionsAll().subscribe({
      next: (reactions: CustomReactionList[]) => {
        this.reactions = reactions.map((reaction) => ({
          ...reaction,
          zoomed: false
        }));
        this._cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load reactions', err);
      }
    });
  }

  showReactions() {
    this.reactionsVisible = true;
  }

  hideReactions() {
    this.reactionsVisible = false;
  }

  zoomIn(reaction: CustomReactionList & { zoomed: boolean }) {
    reaction.zoomed = true;
  }

  zoomOut(reaction: CustomReactionList & { zoomed: boolean }) {
    reaction.zoomed = false;
  }
}
