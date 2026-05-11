import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkyImageComponent } from './worky-image.component';

@NgModule({
  imports: [
    CommonModule,
    WorkyImageComponent
  ],
  exports: [
    WorkyImageComponent
  ]
})
export class WorkyImageModule { } 