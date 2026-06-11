import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ImageOrganizerComponent } from './image-organizer.component';
import { MediaViewComponent } from './components/media-view/media-view.component';
import { ImageLoadingComponent } from './components/media-view/image-loading/image-loading.component';
import { MessageLoadingComponent } from './components/media-view/message-loading/message-loading.component';
import { HeaderViewContentComponent } from './components/media-view/message-loading/header-view-content/header-view-content.component';
import { BodyViewContentComponent } from './components/media-view/message-loading/body-view-content/body-view-content.component';
import { ImageSkeletonComponent } from '@shared/components/skeleton/image-skeleton.component';
import { WorkyImageComponent } from '../worky-image/worky-image.component';
import { OptimizedVideoComponent } from '@shared/components/optimized-video/optimized-video.component';
import { WorkyAvatarModule } from '../worky-avatar/worky-avatar.module';
import { PipesSharedModule } from '@shared/pipes/pipes-shared.module';
import { ReactionsModule } from '../reactions/reactions.module';
import { AddPublicationModule } from '../addPublication/addPublication.module';
import { TranslationsModule } from '../translations/translations.module';

@NgModule({
  declarations: [
    ImageOrganizerComponent,
    MediaViewComponent,
    ImageLoadingComponent,
    MessageLoadingComponent,
    HeaderViewContentComponent,
    BodyViewContentComponent,
  ],
  imports: [
    CommonModule,
    WorkyAvatarModule,
    PipesSharedModule,
    ReactionsModule,
    AddPublicationModule,
    TranslationsModule,
    ImageSkeletonComponent,
    WorkyImageComponent,
    OptimizedVideoComponent,
  ],
  exports: [ImageOrganizerComponent],
})
export class ImageOrganizerModule {}
