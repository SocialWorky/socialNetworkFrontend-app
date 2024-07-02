import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SideBarMenuComponent } from './sidebar-menu.component';
import { WorkyAvatarModule } from '../worky-avatar/worky-avatar.module';



@NgModule({
  declarations: [SideBarMenuComponent],
  imports: [
    CommonModule,
    WorkyAvatarModule
  ],
  exports: [SideBarMenuComponent]
})
export class SideBarMenutModule { }
