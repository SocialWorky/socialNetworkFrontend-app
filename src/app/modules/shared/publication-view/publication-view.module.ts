import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PublicationViewComponent } from './publication-view.component';
import { WorkyAvatarModule } from '../worky-avatar/worky-avatar.module';



@NgModule({
  declarations: [PublicationViewComponent],
  imports: [
    CommonModule,
    WorkyAvatarModule
  ],
  exports: [PublicationViewComponent]
})
export class PublicationViewModule { }
