import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationsPanelComponent } from './notifications-panel.component';

@NgModule({
  declarations: [NotificationsPanelComponent],
  imports: [
    CommonModule
  ],
  exports: [NotificationsPanelComponent]
})
export class NotificationsPanelModule { }
