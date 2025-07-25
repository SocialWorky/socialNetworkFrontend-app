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
import { ImageSkeletonComponent } from '../../components/skeleton/image-skeleton.component';
import { TextSkeletonComponent } from '../../components/skeleton/text-skeleton.component';
import { AvatarSkeletonComponent } from '../../components/skeleton/avatar-skeleton.component';
import { ButtonSkeletonComponent } from '../../components/skeleton/button-skeleton.component';


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
    GifSearchModule,
    ImageSkeletonComponent,
    TextSkeletonComponent,
    AvatarSkeletonComponent,
    ButtonSkeletonComponent
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
