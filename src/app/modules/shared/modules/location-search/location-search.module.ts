import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LocationSearchComponent } from './location-search.component';

@NgModule({
  declarations: [LocationSearchComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  exports: [LocationSearchComponent]
})
export class LocationSearchModule { }
