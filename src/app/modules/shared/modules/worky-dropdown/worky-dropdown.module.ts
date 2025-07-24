import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { WorkyDropdownComponent } from './worky-dropdown.component';
import { WorkyAvatarModule } from '../worky-avatar/worky-avatar.module';
import { OptimizedImageComponent } from '../../components/optimized-image/optimized-image.component';

@NgModule({
  declarations: [WorkyDropdownComponent],
  imports: [
    CommonModule,
    WorkyAvatarModule,
    OptimizedImageComponent
  ],
  exports: [WorkyDropdownComponent],
})
export class WorkyDropdownModule { }
