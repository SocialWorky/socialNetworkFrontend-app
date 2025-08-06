import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GifSearchComponent } from './gif-search.component';
import { TranslationsModule } from '../translations/translations.module';

@NgModule({
  declarations: [GifSearchComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslationsModule
  ],
  exports: [GifSearchComponent]
})
export class GifSearchModule { }
