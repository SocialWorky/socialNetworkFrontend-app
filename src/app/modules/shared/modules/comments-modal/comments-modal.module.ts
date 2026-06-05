import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { CommentsModalComponent } from './comments-modal.component';
import { WorkyAvatarModule } from '../worky-avatar/worky-avatar.module';
import { AddPublicationModule } from '../addPublication/addPublication.module';
import { TranslationsModule } from '../translations/translations.module';
import { ImageOrganizerModule } from '../image-organizer/image-organizer.module';
import { MaterialModule } from '@shared/modules/material/material.module';
import { PipesSharedModule } from '@shared/pipes/pipes-shared.module';
import { ProcessingMediaModule } from '@shared/modules/processing-media/processing-media.module';
import { SharedModule } from '../../shared.module';

@NgModule({
  declarations: [CommentsModalComponent],
  exports: [CommentsModalComponent],
  imports: [
    CommonModule,
    RouterModule,
    WorkyAvatarModule,
    AddPublicationModule,
    TranslationsModule,
    ImageOrganizerModule,
    MaterialModule,
    PipesSharedModule,
    ProcessingMediaModule,
    SharedModule,
  ],
})
export class CommentsModalModule {}
