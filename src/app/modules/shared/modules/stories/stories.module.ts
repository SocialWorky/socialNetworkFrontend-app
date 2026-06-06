import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { StoriesCarouselComponent } from './components/stories-carousel/stories-carousel.component';
import { StoryViewerComponent } from './components/story-viewer/story-viewer.component';
import { StoryCreateComponent } from './story-create/story-create.component';
import { TranslationsModule } from '../translations/translations.module';
import { WorkyAvatarModule } from '../worky-avatar/worky-avatar.module';

@NgModule({
  declarations: [
    StoriesCarouselComponent,
    StoryViewerComponent,
    StoryCreateComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule,
    TranslationsModule,
    WorkyAvatarModule,
  ],
  exports: [
    StoriesCarouselComponent,
    StoryViewerComponent,
    StoryCreateComponent,
  ],
})
export class StoriesModule {}
