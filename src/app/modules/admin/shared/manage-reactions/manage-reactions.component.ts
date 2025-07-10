import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LoadingController } from '@ionic/angular';
import { takeUntil, filter, take, timeout, catchError } from 'rxjs/operators';
import { Subject, of } from 'rxjs';

import { CustomReactionsService } from '@admin/shared/manage-reactions/service/customReactions.service';
import { CustomReactionList } from '@admin/interfaces/customReactions.interface';
import { AlertService } from '@shared/services/alert.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { translations } from '@translations/translations';
import { FileUploadService } from '@shared/services/core-apis/file-upload.service';
import { environment } from '@env/environment';
import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';
import { UtilityService } from '@shared/services/utility.service';
import { SocketService } from '@shared/services/socket.service';
import { EmojiEventsService } from '@shared/services/emoji-events.service';

@Component({
    selector: 'worky-manage-reactions',
    templateUrl: './manage-reactions.component.html',
    styleUrls: ['./manage-reactions.component.scss'],
    standalone: false
})
export class ManageReactionsComponent implements OnInit, OnDestroy {
  reactionForm: FormGroup;

  reactionsList: CustomReactionList[] = [];

  urlApiFile: string = '';

  loadReactionsButtons = false;

  public imageFile: File | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private _fb: FormBuilder,
    private _customReactionsService: CustomReactionsService,
    private _alertService: AlertService,
    private _loadingCtrl: LoadingController,
    private _cdr: ChangeDetectorRef,
    private _fileUploadService: FileUploadService,
    private _utilityService: UtilityService,
    private _socketService: SocketService,
    private _emojiEventsService: EmojiEventsService
  ) {
    this.reactionForm = this._fb.group({
      name: ['', Validators.required],
      emoji: ['', Validators.required],
    });
  }

  ngOnInit() {
    this.initializeComponent();
  }

  private async initializeComponent() {
    const connected = await this.waitForSocketConnection();
    
    if (connected) {
      this.subscribeToEmojiEvents();
      this.urlApiFile = `${environment.APIFILESERVICE}emojis/`;
      this.listReactions();
    } else {
      this.subscribeToEmojiEvents();
      this.urlApiFile = `${environment.APIFILESERVICE}emojis/`;
      this.listReactions();
    }
  }

  private async waitForSocketConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this._socketService.isConnected()) {
        resolve(true);
        return;
      }

      this._socketService.connectionStatus.pipe(
        filter(connected => connected),
        take(1),
        timeout(10000),
        catchError(() => of(false))
      ).subscribe((connected) => {
        resolve(connected);
      });

      setTimeout(() => {
        if (!this._socketService.isConnected()) {
          this._socketService.connectToWebSocket();
        }
      }, 2000);
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToEmojiEvents() {    
    this._emojiEventsService.emojiProcessed$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((message: any) => {
      if(message.type === TypePublishing.EMOJI) {
        this.handleImageProcessed(message);
      }
    });
  }

  listReactions() {
    this._customReactionsService.getCustomReactionsAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (reactions: CustomReactionList[]) => {
        this.reactionsList = reactions
          .filter((reaction) => reaction.isDeleted === false)
          .map((reaction) => ({
            ...reaction,
            zoomed: false,
          }));
        this._cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load reactions', err);
      },
    });
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.imageFile = file;
      this.reactionForm.patchValue({
        emoji: '',
      });
      this.reactionForm.get('emoji')?.clearValidators();
      this.reactionForm.get('emoji')?.updateValueAndValidity();
    } else {
      this.imageFile = null;
      this.reactionForm.get('emoji')?.setValidators([Validators.required]);
      this.reactionForm.get('emoji')?.updateValueAndValidity();
    }
  }

  createCustomReaction() {
    const idImagenMoment = Date.now().toString() + Math.random().toString(36).substring(2, 15);
    this.loadReactionsButtons = true;
    if (this.reactionForm.valid) {
      if (this.imageFile) {
        this._fileUploadService.uploadFile([this.imageFile], 'emojis', idImagenMoment, null, TypePublishing.EMOJI).pipe(takeUntil(this.destroy$)).subscribe({
          error: (err) => {
            this.loadReactionsButtons = false;
            this._cdr.markForCheck();

              this._alertService.showAlert(
                'Error',
                'Error al subir archivo, intente de nuevo. Con otro formato o tamaño.',
                Alerts.ERROR,
                Position.CENTER,
                true,
                translations['button.ok'],
              );
          },
        });
      } else {
        this.submitReaction();
      }
    } else {
      this.loadReactionsButtons = false;
    }
  }

  handleImageProcessed(message: any) {
    this.reactionForm.patchValue({ emoji: this.urlApiFile + message.data.compressed });
    this._cdr.markForCheck();
    this._utilityService.sleep(1000);
    this.submitReaction();
  }

  async submitReaction() {
    const loadingReaction = await this._loadingCtrl.create({
      message: 'Creating reaction...',
    });

    await loadingReaction.present();

    const reaction = this.reactionForm.value;
    this._customReactionsService
      .createCustomReaction(reaction)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this._alertService.showAlert(
            'Exito',
            'Reaction created successfully',
            Alerts.SUCCESS,
            Position.CENTER,
            true,
            translations['button.ok'],
          );

          this.reactionForm.reset();
          this.imageFile = null;
          this.reactionForm.get('emoji')?.setValidators([Validators.required]);
          this.reactionForm.get('emoji')?.updateValueAndValidity();
          const fileInput = document.getElementById('image') as HTMLInputElement;
          if (fileInput) {
            fileInput.value = '';
          }
          loadingReaction.dismiss();
          this.listReactions();
          this.loadReactionsButtons = false;
        },
        error: (err) => {
          console.error('Failed to create reaction', err);
          loadingReaction.dismiss();
          this.loadReactionsButtons = false;
        }
      });
  }

  deleteReaction(id: string) {
    this._customReactionsService
      .deleteCustomReaction(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this._alertService.showAlert(
            'Exito',
            'Reaction deleted successfully',
            Alerts.SUCCESS,
            Position.CENTER,
            true,
            translations['button.ok'],
          );

          this.listReactions();
        },
      });
  }
}
