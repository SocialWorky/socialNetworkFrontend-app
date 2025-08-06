import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserOnlineComponent } from './user-online.component';
import { WorkyAvatarModule } from '../worky-avatar/worky-avatar.module';
import { TranslationsModule } from '../translations/translations.module';

@NgModule({
  declarations: [UserOnlineComponent],
  imports: [
    CommonModule,
    WorkyAvatarModule,
    TranslationsModule
  ],
  exports: [UserOnlineComponent]
})
export class UserOnlineModule { }
