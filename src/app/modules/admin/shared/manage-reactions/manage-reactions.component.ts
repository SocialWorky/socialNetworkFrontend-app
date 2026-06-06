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
import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';
import { UtilityService } from '@shared/services/utility.service';
import { SocketService, ConnectionState } from '@shared/services/socket.service';
import { EmojiEventsService } from '@shared/services/emoji-events.service';
import { ImageService } from '@shared/services/image.service';

@Component({
    selector: 'worky-manage-reactions',
    templateUrl: './manage-reactions.component.html',
    styleUrls: ['./manage-reactions.component.scss'],
    standalone: false
})
export class ManageReactionsComponent implements OnInit, OnDestroy {
  reactionForm: FormGroup;

  reactionsList: CustomReactionList[] = [];

  isLoading = true;
  loadReactionsButtons = false;

  public imageFile: File | null = null;
  public imagePreview: string | null = null;
  public selectedFileName: string = '';

  error: string | null = null;

  editingReactionId: string | null = null;
  isEditing: boolean = false;



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
    private _logService: LogService,
    private _imageService: ImageService
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
    // Wait for the socket connection so emoji-processed events are received.
    await this.waitForSocketConnection();

    this.subscribeToEmojiEvents();
    this.listReactions();
  }

  private async waitForSocketConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this._socketService.isConnected()) {
        resolve(true);
        return;
      }

      this._socketService.connectionStatus.pipe(
        filter(state => state.connected),
        take(1),
        timeout(10000),
        catchError(() => {
          return of({ connected: false, reconnecting: false, reconnectAttempt: 0, lastConnected: null, lastDisconnected: null, error: null });
        })
      ).subscribe((state) => {
        resolve(state?.connected ?? false);
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

  listReactions(forceRefresh: boolean = false): Promise<void> {
    return new Promise((resolve) => {
      this.isLoading = true;
      this.error = null;

      // Clear image cache to ensure fresh images are loaded
      if (forceRefresh) {
        this._imageService.clearCache();
      }

      this._customReactionsService.getCustomReactionsAll(forceRefresh)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (reactions: CustomReactionList[]) => {
            // Add cache-buster timestamp to emoji URLs when force refreshing
            const cacheBuster = forceRefresh ? `?t=${Date.now()}` : '';

            const filteredReactions = reactions
              .filter((reaction) => reaction.isDeleted === false)
              .map((reaction) => ({
                ...reaction,
                // Add cache-buster to emoji URL to bypass browser/service-worker cache
                emoji: forceRefresh && reaction.emoji ? `${reaction.emoji}${cacheBuster}` : reaction.emoji,
                zoomed: false,
              }));

            this.reactionsList = [...filteredReactions];
            this.isLoading = false;
            this._cdr.detectChanges();
            resolve();
          },
          error: (err) => {
            this._logService.log(
              LevelLogEnum.ERROR,
              'ManageReactionsComponent',
              'Failed to load reactions',
              { error: String(err) }
            );
            this.error = translations['admin.reactions.errorLoad'];
            this.isLoading = false;
            this._cdr.detectChanges();
            resolve();
          },
        });
    });
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.imageFile = file;
      this.selectedFileName = file.name;
      
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
    event.target.style.display = 'none';
    
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
        if (this.reactionForm.get('emoji')?.value || this.imagePreview) {
          this.submitReaction();
        } else {
          this.loadReactionsButtons = false;
          this.error = translations['admin.manageReactions.errors.requiredFields'];
          this._cdr.markForCheck();
        }
      }
    } else {
      this.loadReactionsButtons = false;
      this.error = translations['admin.manageReactions.errors.requiredFields'];
      this._cdr.markForCheck();
    }
  }

  editReaction(reaction: CustomReactionList) {
    this.editingReactionId = reaction._id;
    this.isEditing = true;
    this.reactionForm.patchValue({
      name: reaction.name,
      emoji: reaction.emoji,
    });
    
    if (reaction.emoji && reaction.emoji.startsWith('http')) {
      this.imagePreview = reaction.emoji;
      this.selectedFileName = reaction.name + translations['admin.reactions.currentImageSuffix'];
      this.reactionForm.get('emoji')?.clearValidators();
      this.reactionForm.get('emoji')?.updateValueAndValidity();
    }
    
    const formElement = document.querySelector('.bg-white\\/5');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    this._cdr.markForCheck();
  }

  cancelEdit() {
    this.editingReactionId = null;
    this.isEditing = false;
    this.reactionForm.reset();
    this.clearSelectedFile();
    const fileInput = document.getElementById('image') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    this._cdr.markForCheck();
  }

  handleImageProcessed(message: any) {
    const emojiUrl = message.data?.urlCompressed || message.data?.compressed;

    // Store the relative path only; the storage base URL is resolved at display
    // time via normalizeImageUrl, like every other image type. Baking the base
    // here produced "undefined/emojis/..." paths whenever MINIO_BUCKET_URL was unset.
    this.reactionForm.patchValue({ emoji: emojiUrl });
    this._cdr.markForCheck();
    this._utilityService.sleep(1000);
    this.submitReaction();
  }

  async submitReaction() {
    const loadingMessage = this.isEditing 
      ? (translations['admin.manageReactions.loading.updating'] || 'Updating reaction...')
      : translations['admin.manageReactions.loading.creating'];
    
    const loadingReaction = await this._loadingCtrl.create({
      message: loadingMessage,
    });

    await loadingReaction.present();

    const reaction = this.reactionForm.value;
    
    if (this.isEditing && this.editingReactionId) {
      this._customReactionsService
        .updateCustomReaction(this.editingReactionId, reaction)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: async (response) => {
            loadingReaction.dismiss();
            this.cancelEdit();
            this.loadReactionsButtons = false;
            
            await this._utilityService.sleep(300);
            await this.listReactions(true);
            
            const successMessage = translations['admin.manageReactions.success.updated'] || 'Reaction updated successfully';
            this._alertService.showAlert(
              translations['admin.manageReactions.success.title'],
              successMessage,
              Alerts.SUCCESS,
              Position.CENTER,
              true,
              translations['button.ok'],
            );
          },
          error: (err) => {
            this._logService.log(
              LevelLogEnum.ERROR,
              'ManageReactionsComponent',
              'Failed to update reaction',
              { error: String(err), reactionData: this.reactionForm.value, reactionId: this.editingReactionId }
            );
            this.error = translations['admin.manageReactions.errors.updateError'] || 'Error updating reaction. Please try again.';
            loadingReaction.dismiss();
            this.loadReactionsButtons = false;
            this._cdr.markForCheck();
          }
        });
    } else {
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
            this.listReactions(true);  // Force refresh to bypass cache
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

          this.listReactions(true);  // Force refresh to update list
        },
        error: (err) => {
          this._logService.log(
            LevelLogEnum.ERROR,
            'ManageReactionsComponent',
            'Failed to delete reaction',
            { error: String(err), reactionId: id }
          );
          this.error = translations['admin.reactions.errorDelete'];
          this._cdr.markForCheck();
        }
      });
  }

  getEditTitle(): string {
    if (this.isEditing) {
      return translations['admin.manageReactions.edit.title'] || 'Edit Reaction';
    }
    return translations['admin.manageReactions.create.title'];
  }

  getEditSubtitle(): string {
    if (this.isEditing) {
      return translations['admin.manageReactions.edit.subtitle'] || 'Modify reaction data';
    }
    return translations['admin.manageReactions.create.subtitle'];
  }

  getCancelText(): string {
    return translations['button.cancel'] || 'Cancel';
  }

  getSubmitButtonText(): string {
    if (this.isEditing) {
      return translations['admin.manageReactions.edit.button'] || 'Save Changes';
    }
    return translations['admin.manageReactions.create.button'];
  }

  getEditButtonText(): string {
    return translations['admin.manageReactions.list.edit'] || 'Edit';
  }
}
