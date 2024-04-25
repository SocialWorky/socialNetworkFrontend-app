import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkyAvatarComponent } from './worky-avatar.component';



@NgModule({
  declarations: [WorkyAvatarComponent],
  imports: [
    CommonModule
  ],
  exports: [WorkyAvatarComponent]
})
export class WorkyAvatarModule { }
