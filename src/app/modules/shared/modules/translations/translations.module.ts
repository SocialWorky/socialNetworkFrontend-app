import { NgModule } from '@angular/core';
import { TranslationsPipe } from './pipes/translations.pipe';

@NgModule({
  imports: [
    TranslationsPipe
  ],
  exports: [
    TranslationsPipe
  ],
})
export class TranslationsModule { }
