import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditInfoProfileComponent } from './edit-info-profile.component';
import { ReactiveFormsModule } from '@angular/forms';



@NgModule({
  declarations: [EditInfoProfileComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  exports: [EditInfoProfileComponent]
})
export class EditInfoProfileModule { }
