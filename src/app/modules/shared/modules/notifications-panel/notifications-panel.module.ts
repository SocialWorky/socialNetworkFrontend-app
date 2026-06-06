import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationsPanelComponent } from './notifications-panel.component';
import { PipesSharedModule } from '@shared/pipes/pipes-shared.module';
import { TranslationsModule } from '../translations/translations.module';
import { WorkyAvatarModule } from '../worky-avatar/worky-avatar.module';

@NgModule({
  declarations: [NotificationsPanelComponent],
  imports: [
    CommonModule,
    PipesSharedModule,
    TranslationsModule,
    WorkyAvatarModule,
  ],
  exports: [NotificationsPanelComponent]
})
export class NotificationsPanelModule { }
