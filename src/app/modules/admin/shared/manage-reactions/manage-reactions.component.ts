import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LoadingController } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';

import { CustomReactionsService } from '@admin/shared/manage-reactions/service/customReactions.service';
import { CustomReactionList } from '@admin/interfaces/customReactions.interface';
import { AlertService } from '@shared/services/alert.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { translations } from '@translations/translations';
import { FileUploadService } from '@shared/services/core-apis/file-upload.service';
import { environment } from '@env/environment';

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
  ) {
    this.reactionForm = this._fb.group({
      name: ['', Validators.required],
      emoji: ['', Validators.required],
    });
  }

  ngOnInit() {
    this.urlApiFile = `${environment.APIFILESERVICE}emojis/`;
    this.listReactions();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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
    this.loadReactionsButtons = true;
    if (this.reactionForm.valid) {
      if (this.imageFile) {
        this._fileUploadService.uploadFile([this.imageFile], 'emojis').pipe(takeUntil(this.destroy$)).subscribe({
          next: (response) => {
            this.reactionForm.patchValue({ emoji: this.urlApiFile + response[0].filenameCompressed });
            this.submitReaction();
          },
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
      console.log('Form is invalid');
      this.loadReactionsButtons = false;
    }
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
