import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ImageOrganizerComponent } from './image-organizer.component';

@NgModule({
  declarations: [ImageOrganizerComponent],
  imports: [CommonModule],
  exports: [ImageOrganizerComponent],
})
export class ImageOrganizerModule {}
