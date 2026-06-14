import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UserMenuPanelComponent } from './user-menu-panel.component';
import { TranslationsModule } from '../translations/translations.module';
import { WorkyAvatarModule } from '../worky-avatar/worky-avatar.module';

@NgModule({
  declarations: [UserMenuPanelComponent],
  imports: [CommonModule, TranslationsModule, WorkyAvatarModule],
  exports: [UserMenuPanelComponent],
})
export class UserMenuPanelModule {}
