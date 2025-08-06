import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProcessingMediaComponent } from './processing-media.component';
import { TranslationsModule } from '../translations/translations.module';

@NgModule({
  imports: [
    CommonModule,
    TranslationsModule
  ],
  declarations: [ProcessingMediaComponent],
  exports: [ProcessingMediaComponent]
})
export class ProcessingMediaModule { }
