import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkyButtonsModule } from '../buttons/buttons.module';
import { MaterialModule } from '../material/material.module';
import { ImageUploadModalComponent } from './image-upload-modal.component';

@NgModule({
  declarations: [ImageUploadModalComponent],
  imports: [
    CommonModule,
    WorkyButtonsModule,
    MaterialModule,
  ],
  exports: [ImageUploadModalComponent]
})
export class ImageUploadModalModule { }
