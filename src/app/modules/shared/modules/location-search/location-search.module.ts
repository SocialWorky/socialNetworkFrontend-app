import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LocationSearchComponent } from './location-search.component';
import { TranslationsModule } from '../translations/translations.module';

@NgModule({
  declarations: [LocationSearchComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslationsModule,
  ],
  exports: [LocationSearchComponent]
})
export class LocationSearchModule { }
