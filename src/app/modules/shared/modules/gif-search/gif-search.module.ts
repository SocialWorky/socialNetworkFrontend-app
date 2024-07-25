import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GifSearchComponent } from './gif-search.component';

@NgModule({
  declarations: [GifSearchComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  exports: [GifSearchComponent]
})
export class GifSearchModule { }
