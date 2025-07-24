import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MarkdownModule } from 'ngx-markdown';

import { PublicationViewComponent } from './publication-view.component';
import { WorkyAvatarModule } from '../worky-avatar/worky-avatar.module';
import { AddPublicationModule } from '../addPublication/addPublication.module';
import { TranslationsModule } from '../translations/translations.module';
import { WorkyDropdownModule } from '../worky-dropdown/worky-dropdown.module';
import { ImageOrganizerModule } from '../image-organizer/image-organizer.module';
import { ReportResponseComponent } from './report-response/report-response.component';
import { ReactionsModule } from '../reactions/reactions.module';
import { WorkyButtonsModule } from '../buttons/buttons.module';
import { MaterialModule } from '@shared/modules/material/material.module';
import { PipesSharedModule } from '@shared/pipes/pipes-shared.module';
import { ProcessingMediaModule } from '@shared/modules/processing-media/processing-media.module';
import { OptimizedImageComponent } from '../../components/optimized-image/optimized-image.component';

@NgModule({
  declarations: [PublicationViewComponent, ReportResponseComponent],
  exports: [PublicationViewComponent],
  imports: [
    CommonModule,
    WorkyAvatarModule,
    AddPublicationModule,
    TranslationsModule,
    WorkyDropdownModule,
    ImageOrganizerModule,
    ReactionsModule,
    RouterModule,
    MarkdownModule.forRoot(),
    WorkyButtonsModule,
    MaterialModule,
    PipesSharedModule,
    ProcessingMediaModule,
    OptimizedImageComponent,
  ],
})
export class PublicationViewModule {}
