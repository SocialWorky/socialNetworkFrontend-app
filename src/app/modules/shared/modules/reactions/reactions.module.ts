import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationsModule } from '../translations/translations.module';
import { MaterialModule } from '../material/material.module';
import { WorkyImageModule } from '../worky-image/worky-image.module';

import { ReactionsComponent } from './reactions.component';



@NgModule({
  declarations: [ReactionsComponent],
  imports: [
    CommonModule,
    TranslationsModule,
    MaterialModule,
    WorkyImageModule
  ],
  exports: [ReactionsComponent]
})
export class ReactionsModule { }
