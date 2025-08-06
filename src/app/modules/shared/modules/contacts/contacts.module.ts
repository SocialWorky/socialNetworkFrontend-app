import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContactsComponent } from './contacts.component';
import { TranslationsModule } from '../translations/translations.module';


@NgModule({
  declarations: [ContactsComponent],
  imports: [
    CommonModule,
    TranslationsModule
  ],
  exports: [ContactsComponent]
})
export class ContactsModule { }
