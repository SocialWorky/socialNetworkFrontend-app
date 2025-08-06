import { CommonModule,  NgOptimizedImage  } from '@angular/common';
import { NgModule } from '@angular/core';

import { ImageOrganizerComponent } from './image-organizer.component';
import { MediaViewComponent } from './components/media-view/media-view.component';
import { ImageLoadingComponent } from './components/media-view/image-loading/image-loading.component';
import { MessageLoadingComponent } from './components/media-view/message-loading/message-loading.component';
import { HeaderViewContentComponent } from './components/media-view/message-loading/header-view-content/header-view-content.component';
import { BodyViewContentComponent } from './components/media-view/message-loading/body-view-content/body-view-content.component';

import { WorkyAvatarModule } from '../worky-avatar/worky-avatar.module';
import { PipesSharedModule } from '@shared/pipes/pipes-shared.module';
import { ReactionsModule } from '../reactions/reactions.module';
import { AddPublicationModule } from '../addPublication/addPublication.module';
import { WorkyImageModule } from '../worky-image/worky-image.module';

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
    NgOptimizedImage,
    WorkyAvatarModule,
    PipesSharedModule,
    ReactionsModule,
    AddPublicationModule,
    WorkyImageModule,
  ],
  exports: [ImageOrganizerComponent],
})
export class ImageOrganizerModule {}
