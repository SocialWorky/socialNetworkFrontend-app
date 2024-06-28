import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserOnlineComponent } from './user-online.component';
import { WorkyAvatarModule } from '../worky-avatar/worky-avatar.module';

@NgModule({
  declarations: [UserOnlineComponent],
  imports: [
    CommonModule,
    WorkyAvatarModule
  ],
  exports: [UserOnlineComponent]
})
export class UserOnlineModule { }
