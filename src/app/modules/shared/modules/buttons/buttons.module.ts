import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlexLayoutModule } from '@angular/flex-layout';

import { ButtonsComponent } from './buttons.component';
import { MaterialModule } from '../material/material.module';


@NgModule({
  declarations: [ButtonsComponent],
  imports: [
    CommonModule,
    FlexLayoutModule,
    MaterialModule
  ],
  exports: [ButtonsComponent]
})
export class WorkyButtonsModule { }
