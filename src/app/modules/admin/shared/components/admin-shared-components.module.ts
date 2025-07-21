import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

// Components
import { PaginationComponent } from './pagination/pagination.component';

@NgModule({
  declarations: [
    PaginationComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    PaginationComponent
  ]
})
export class AdminSharedComponentsModule { } 