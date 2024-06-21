import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CustomReactionsService } from '@admin/shared/manage-reactions/service/customReactions.service';
import { CustomReactionList } from '@admin/interfaces/customReactions.interface';
import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';
import { ReactionsService } from '@shared/services/reactions.service';
import { AuthService } from '@auth/services/auth.service';
import { PublicationService } from '@shared/services/publication.service';
import { PublicationsReactions } from '@shared/interfaces/reactions.interface';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'worky-reactions',
  templateUrl: './reactions.component.html',
  styleUrls: ['./reactions.component.scss'],
})
export class ReactionsComponent implements OnInit, OnDestroy {
  reactionsVisible = false;

  reactions: Array<CustomReactionList & { zoomed: boolean }> = [];

  typePublishing = TypePublishing;

  @Input() type: TypePublishing | undefined;

  @Input() userProfile?: string;

  @Input() idPublication: string | undefined;

  @Input() reactionsToPublication: PublicationsReactions[] = [];

  token = this._authService.getDecodedToken();

  private destroy$ = new Subject<void>();
  private touchTimeout: any;

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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  addReaction(reaction: CustomReactionList) {
    if (this.reactionUserInPublication) {
      this.editReaction(this.reactionUserInPublication._id, reaction);
      return;
    }
    this._reactionsService
      .createReaction({
        authorId: this.token.id,
        _idCustomReaction: reaction._id,
        isPublications: this.type === TypePublishing.POST || TypePublishing.POSTPROFILE ? true : false,
        isComment: this.type === TypePublishing.COMMENT ? true : false,
        _idPublication: this.idPublication!,
      }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async () => {
          this.reactionsVisible = false;
          this.refreshPublications();
        },
        error: (err) => {
          console.error('Failed to add reaction', err);
        }
      });
  }

  deleteReaction(idReaction: string) {
    this._reactionsService.deleteReaction(idReaction).pipe(takeUntil(this.destroy$)).subscribe({
      next: async () => {
        this.refreshPublications();
      },
      error: (err) => {
        console.error('Failed to delete reaction', err);
      }
    });
  }

  editReaction(id: string, reaction: CustomReactionList) {
    this._reactionsService.editReaction(id, {
      authorId: this.token.id,
      _idCustomReaction: reaction._id,
      isPublications: this.type === TypePublishing.POST || this.typePublishing.POSTPROFILE ? true : false,
      isComment: this.type === TypePublishing.COMMENT ? true : false,
      _idPublication: this.idPublication!,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: async () => {
        this.refreshPublications();
      },
      error: (err) => {
        console.error('Failed to edit reaction', err);
      }
    });
  }

  loadReactions() {
    this._customReactionsService.getCustomReactionsAll().pipe(takeUntil(this.destroy$)).subscribe({
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

  async refreshPublications() {
    if (this.type === TypePublishing.POSTPROFILE) {
      const refreshPublications = await this._publicationService.getAllPublications(1, 10, TypePublishing.POSTPROFILE, this.userProfile);
      this._publicationService.updatePublications(refreshPublications);
      this._cdr.markForCheck();

    } else {
      const refreshPublications = await this._publicationService.getAllPublications(1, 10);
      this._publicationService.updatePublications(refreshPublications);
      this._cdr.markForCheck();
    }
  }

  onTouchStart() {
    this.touchTimeout = setTimeout(() => {
      this.showReactions();
    }, 500);
  }

  onTouchEnd() {
    if (this.touchTimeout) {
      clearTimeout(this.touchTimeout);
    }
  }
}
