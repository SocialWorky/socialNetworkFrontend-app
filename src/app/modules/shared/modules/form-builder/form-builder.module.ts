import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { MaterialModule } from '../material/material.module';
import { FormBuilderComponent } from './form-builder.component';
import { InputComponent, TextareaComponent, SelectComponent } from './fields/index';
import { TranslationsModule } from '../translations/translations.module';

@NgModule({
  declarations: [
    FormBuilderComponent,
    InputComponent,
    TextareaComponent,
    SelectComponent,
  ],
  imports: [
    CommonModule,
    DragDropModule,
    ReactiveFormsModule,
    FormsModule,
    MaterialModule,
    TranslationsModule
  ],
  exports: [FormBuilderComponent, InputComponent, TextareaComponent, SelectComponent]
})
export class FormBuilderModule { }
