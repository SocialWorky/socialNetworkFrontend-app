import { CommonModule,  NgOptimizedImage  } from '@angular/common';
import { NgModule } from '@angular/core';

import { ImageOrganizerComponent } from './image-organizer.component';

@NgModule({
  declarations: [ImageOrganizerComponent],
  imports: [CommonModule, NgOptimizedImage],
  exports: [ImageOrganizerComponent],
})
export class ImageOrganizerModule {}
