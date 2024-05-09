import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { ReactiveFormsModule } from '@angular/forms';

import { MaterialModule } from '../material/material.module';
import { TranslationsModule } from '../translations/translations.module';
import { WorkyButtonsModule } from '../buttons/buttons.module';
import { AddPublicationComponent } from './addPublication.component';
import { WorkyAvatarModule } from '../worky-avatar/worky-avatar.module';


@NgModule({
  declarations: [
    AddPublicationComponent
  ],
  imports: [
    CommonModule,
    MaterialModule,
    TranslationsModule,
    WorkyButtonsModule,
    PickerComponent,
    ReactiveFormsModule,
    WorkyAvatarModule
  ],
  exports: [
    AddPublicationComponent,
    ReactiveFormsModule
  ]
})
export class AddPublicationModule { }
