import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PublicationViewComponent } from './publication-view.component';
import { WorkyAvatarModule } from '../worky-avatar/worky-avatar.module';
import { AddPublicationModule } from '../addPublication/addPublication.module';
import { TranslationsModule } from '../translations/translations.module';
import { WorkyDropdownModule } from '../worky-dropdown/worky-dropdown.module';

@NgModule({
  declarations: [PublicationViewComponent],
  imports: [
    CommonModule,
    WorkyAvatarModule,
    AddPublicationModule,
    TranslationsModule,
    WorkyDropdownModule
  ],
  exports: [PublicationViewComponent]
})
export class PublicationViewModule { }
