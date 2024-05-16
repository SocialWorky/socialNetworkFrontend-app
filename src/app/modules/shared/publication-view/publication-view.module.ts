import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PublicationViewComponent } from './publication-view.component';
import { WorkyAvatarModule } from '../worky-avatar/worky-avatar.module';
import { AddPublicationModule } from '../addPublication/addPublication.module';
import { TranslationsModule } from '../translations/translations.module';


@NgModule({
  declarations: [PublicationViewComponent],
  imports: [
    CommonModule,
    WorkyAvatarModule,
    AddPublicationModule,
    TranslationsModule
  ],
  exports: [PublicationViewComponent]
})
export class PublicationViewModule { }
