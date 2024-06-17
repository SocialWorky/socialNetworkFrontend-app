import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LoadingController } from '@ionic/angular';
import { Subscription } from 'rxjs';

import { CustomReactionsService } from '@admin/shared/manage-reactions/service/customReactions.service';
import { CustomReactionList } from '@admin/interfaces/customReactions.interface';
import { AlertService } from '@shared/services/alert.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { translations } from '@translations/translations';

@Component({
  selector: 'worky-manage-reactions',
  templateUrl: './manage-reactions.component.html',
  styleUrls: ['./manage-reactions.component.scss'],
})
export class ManageReactionsComponent implements OnInit, OnDestroy {

  reactionForm: FormGroup;

  reactionsList: CustomReactionList[] = [];

  private subscriptions: Subscription = new Subscription();

  public imageFile: File | null = null; // Cambiado a public

  constructor(
    private _fb: FormBuilder,
    private _customReactionsService: CustomReactionsService,
    private _alertService: AlertService,
    private _loadingCtrl: LoadingController,
    private _cdr: ChangeDetectorRef,
  ) {
    this.reactionForm = this._fb.group({
      name: ['', Validators.required],
      emoji: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.listReactions();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  listReactions() {
    const sub = this._customReactionsService.getCustomReactionsAll().subscribe((response: CustomReactionList[]) => {
      this.reactionsList = response;
      this._cdr.markForCheck();
    });

    this.subscriptions.add(sub);
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.imageFile = file;
      this.reactionForm.patchValue({
        emoji: ''
      });
    }
  }

  createCustomReaction() {
    if (this.reactionForm.valid) {
      if (this.imageFile) {
        this.uploadFile(this.imageFile).subscribe(url => {
          this.reactionForm.patchValue({ emoji: url });
          this.submitReaction();
        });
      } else {
        this.submitReaction();
      }
    } else {
      console.log('Form is invalid');
    }
  }

  async submitReaction() {

    const loadingReaction = await this._loadingCtrl.create({
      message: 'Creating reaction...',
    });

    await loadingReaction.present();

    const reaction = this.reactionForm.value;
    const sub = this._customReactionsService.createCustomReaction(reaction).subscribe(response => {
      this._alertService.showAlert(
        'Exito',
        'Reaction created successfully',
        Alerts.SUCCESS,
        Position.CENTER,
        true,
        true,
        translations['button.ok'],
      );

      this.reactionForm.reset();
      this.imageFile = null;
      loadingReaction.dismiss();
      this.listReactions();
    });

    this.subscriptions.add(sub);
  }

  uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this._customReactionsService.uploadFile(formData);
  }

  deleteReaction(id: string) {
    this._customReactionsService.deleteCustomReaction(id).subscribe(() => {
      this._alertService.showAlert(
        'Exito',
        'Reaction deleted successfully',
        Alerts.SUCCESS,
        Position.CENTER,
        true,
        true,
        translations['button.ok'],
      );

      this.listReactions();
    });
  }
}
