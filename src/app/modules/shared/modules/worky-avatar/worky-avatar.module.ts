import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkyAvatarComponent } from './worky-avatar.component';
import { OptimizedImageComponent } from '../../components/optimized-image/optimized-image.component';

@NgModule({
  declarations: [WorkyAvatarComponent],
  imports: [
    CommonModule,
    OptimizedImageComponent
  ],
  exports: [WorkyAvatarComponent]
})
export class WorkyAvatarModule { }
