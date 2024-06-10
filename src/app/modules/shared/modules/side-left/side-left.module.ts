import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SideLeftComponent } from './side-left.component';
import { WorkyAvatarModule } from '../worky-avatar/worky-avatar.module';



@NgModule({
  declarations: [SideLeftComponent],
  imports: [
    CommonModule,
    WorkyAvatarModule
  ],
  exports: [SideLeftComponent]
})
export class SideLeftModule { }
