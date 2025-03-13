import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TooltipsOnboardingService } from '@shared/services/tooltips-onboarding.service';

import { MaterialModule } from '../material/material.module';
import { TranslationsModule } from '../translations/translations.module';
import { WorkyButtonsModule } from '../buttons/buttons.module';
import { AddPublicationComponent } from './addPublication.component';
import { WorkyAvatarModule } from '../worky-avatar/worky-avatar.module';
import { LocationSearchModule } from '../location-search/location-search.module';
import { ImageUploadModalModule } from '../image-upload-modal/image-upload-modal.module';
import { GifSearchModule } from '../gif-search/gif-search.module';


@NgModule({
  declarations: [
    AddPublicationComponent
  ],
  imports: [
    CommonModule,
    MaterialModule,
    TranslationsModule,
    WorkyButtonsModule,
    PickerModule,
    ReactiveFormsModule,
    IonicModule,
    WorkyAvatarModule,
    LocationSearchModule,
    ImageUploadModalModule,
    GifSearchModule
  ],
  exports: [
    AddPublicationComponent,
    ReactiveFormsModule
  ],
  providers: [
    TooltipsOnboardingService
  ]
})
export class AddPublicationModule { }
