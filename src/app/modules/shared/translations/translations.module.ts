import { NgModule } from '@angular/core';
import { TranslationsPipe } from './pipes/translations.pipe';

@NgModule({
  declarations: [
    TranslationsPipe
  ],
  exports: [
    TranslationsPipe
  ],
})
export class TranslationsModule { }