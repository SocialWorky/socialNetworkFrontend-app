import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LoadingController } from '@ionic/angular';
import { takeUntil, filter, take, timeout, catchError } from 'rxjs/operators';
import { Subject, of } from 'rxjs';

import { CustomReactionsService } from '@admin/shared/manage-reactions/service/customReactions.service';
import { CustomReactionList } from '@admin/interfaces/customReactions.interface';
import { AlertService } from '@shared/services/alert.service';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { translations } from '@translations/translations';
import { FileUploadService } from '@shared/services/core-apis/file-upload.service';
import { environment } from '@env/environment';
import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';
import { UtilityService } from '@shared/services/utility.service';
import { SocketService } from '@shared/services/socket.service';
import { EmojiEventsService } from '@shared/services/emoji-events.service';
import { LoadingSpinnerConfig } from '@admin/shared/components/loading-spinner/loading-spinner.component';

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

  isLoading = true;
  loadReactionsButtons = false;

  public imageFile: File | null = null;
  public imagePreview: string | null = null;
  public selectedFileName: string = '';

  error: string | null = null;

  // Configuraciones para componentes compartidos
  loadingConfig: LoadingSpinnerConfig = {
    size: 'large',
    text: 'Cargando reacciones...',
    overlay: true
  };

  processingConfig: LoadingSpinnerConfig = {
    size: 'medium',
    text: 'Procesando reacción...',
    overlay: true
  };

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
    private _emojiEventsService: EmojiEventsService,
    private _logService: LogService
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
    this.isLoading = true;
    this.error = null;
    this._customReactionsService.getCustomReactionsAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (reactions: CustomReactionList[]) => {
        this.reactionsList = reactions
          .filter((reaction) => reaction.isDeleted === false)
          .map((reaction) => ({
            ...reaction,
            zoomed: false,
          }));
        this.isLoading = false;
        this._cdr.markForCheck();
      },
      error: (err) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'ManageReactionsComponent',
          'Failed to load reactions',
          { error: String(err) }
        );
        this.error = 'Error al cargar las reacciones. Por favor, intenta de nuevo.';
        this.isLoading = false;
        this._cdr.markForCheck();
      },
    });
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.imageFile = file;
      this.selectedFileName = file.name;
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
        this._cdr.markForCheck();
      };
      reader.readAsDataURL(file);
      
      this.reactionForm.patchValue({
        emoji: '',
      });
      this.reactionForm.get('emoji')?.clearValidators();
      this.reactionForm.get('emoji')?.updateValueAndValidity();
    } else {
      this.clearSelectedFile();
    }
  }

  removeSelectedFile() {
    this.clearSelectedFile();
    const fileInput = document.getElementById('image') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  private clearSelectedFile() {
    this.imageFile = null;
    this.imagePreview = null;
    this.selectedFileName = '';
    this.reactionForm.get('emoji')?.setValidators([Validators.required]);
    this.reactionForm.get('emoji')?.updateValueAndValidity();
    this._cdr.markForCheck();
  }

  onImageError(event: any) {
    // Hide the broken image
    event.target.style.display = 'none';
    
    // Create a placeholder icon
    const placeholder = document.createElement('div');
    placeholder.className = 'image-placeholder';
    placeholder.innerHTML = '<i class="material-icons">image</i>';
    placeholder.style.cssText = `
      width: 32px;
      height: 32px;
      background: #374151;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #9ca3af;
      font-size: 14px;
    `;
    event.target.parentNode.appendChild(placeholder);
  }

  createCustomReaction() {
    const idImagenMoment = Date.now().toString() + Math.random().toString(36).substring(2, 15);
    this.loadReactionsButtons = true;
    this.error = null;
    
    if (this.reactionForm.valid) {
      if (this.imageFile) {
        this._fileUploadService.uploadFile([this.imageFile], 'emojis', idImagenMoment, null, TypePublishing.EMOJI).pipe(takeUntil(this.destroy$)).subscribe({
          error: (err) => {
            this._logService.log(
              LevelLogEnum.ERROR,
              'ManageReactionsComponent',
              'Error uploading reaction file',
              { error: String(err), fileName: this.imageFile?.name }
            );
            this.loadReactionsButtons = false;
            this.error = translations['admin.manageReactions.errors.uploadError'];
            this._cdr.markForCheck();

            this._alertService.showAlert(
              translations['admin.manageReactions.errors.title'],
              translations['admin.manageReactions.errors.uploadError'],
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
      this.error = translations['admin.manageReactions.errors.requiredFields'];
      this._cdr.markForCheck();
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
      message: translations['admin.manageReactions.loading.creating'],
    });

    await loadingReaction.present();

    const reaction = this.reactionForm.value;
    this._customReactionsService
      .createCustomReaction(reaction)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this._alertService.showAlert(
            translations['admin.manageReactions.success.title'],
            translations['admin.manageReactions.success.created'],
            Alerts.SUCCESS,
            Position.CENTER,
            true,
            translations['button.ok'],
          );

          this.reactionForm.reset();
          this.clearSelectedFile();
          const fileInput = document.getElementById('image') as HTMLInputElement;
          if (fileInput) {
            fileInput.value = '';
          }
          loadingReaction.dismiss();
          this.listReactions();
          this.loadReactionsButtons = false;
          this._cdr.markForCheck();
        },
        error: (err) => {
          this._logService.log(
            LevelLogEnum.ERROR,
            'ManageReactionsComponent',
            'Failed to create reaction',
            { error: String(err), reactionData: this.reactionForm.value }
          );
          this.error = translations['admin.manageReactions.errors.createError'];
          loadingReaction.dismiss();
          this.loadReactionsButtons = false;
          this._cdr.markForCheck();
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
            translations['admin.manageReactions.success.title'],
            translations['admin.manageReactions.success.deleted'],
            Alerts.SUCCESS,
            Position.CENTER,
            true,
            translations['button.ok'],
          );

          this.listReactions();
        },
        error: (err) => {
          this._logService.log(
            LevelLogEnum.ERROR,
            'ManageReactionsComponent',
            'Failed to delete reaction',
            { error: String(err), reactionId: id }
          );
          this.error = 'Error al eliminar la reacción. Por favor, intenta de nuevo.';
          this._cdr.markForCheck();
        }
      });
  }
}
