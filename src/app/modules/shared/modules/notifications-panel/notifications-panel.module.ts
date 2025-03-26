import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationsPanelComponent } from './notifications-panel.component';
import { PipesSharedModule } from '@shared/pipes/pipes-shared.module';
import { WorkyDropdownModule } from '../worky-dropdown/worky-dropdown.module';
import { TranslationsModule } from '../translations/translations.module';

@NgModule({
  declarations: [NotificationsPanelComponent],
  imports: [
    CommonModule,
    PipesSharedModule,
    WorkyDropdownModule,
    TranslationsModule
  ],
  exports: [NotificationsPanelComponent]
})
export class NotificationsPanelModule { }
