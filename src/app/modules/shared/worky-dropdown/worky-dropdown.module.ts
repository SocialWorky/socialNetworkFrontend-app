import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkyDropdownComponent } from './worky-dropdown.component'



@NgModule({
  declarations: [WorkyDropdownComponent],
  imports: [
    CommonModule
  ],
  exports: [WorkyDropdownComponent],
})
export class WorkyDropdownModule { }
