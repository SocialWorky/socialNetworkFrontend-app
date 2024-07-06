import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SideBarMenuComponent } from './sidebar-menu.component';
import { WorkyAvatarModule } from '../worky-avatar/worky-avatar.module';
import { NotificationsPanelModule } from '../notifications-panel/notifications-panel.module';



@NgModule({
  declarations: [SideBarMenuComponent],
  imports: [
    CommonModule,
    WorkyAvatarModule,
    NotificationsPanelModule
  ],
  exports: [SideBarMenuComponent]
})
export class SideBarMenutModule { }
