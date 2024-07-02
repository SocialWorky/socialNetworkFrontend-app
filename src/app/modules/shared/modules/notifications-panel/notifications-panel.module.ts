import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationsPanelComponent } from './notifications-panel.component';
import { PipesSharedModule } from '@shared/pipes/pipes-shared.module';

@NgModule({
  declarations: [NotificationsPanelComponent],
  imports: [
    CommonModule,
    PipesSharedModule
  ],
  exports: [NotificationsPanelComponent]
})
export class NotificationsPanelModule { }
