import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkyDropdownComponent } from './worky-dropdown.component'
import { WorkyAvatarModule } from '../worky-avatar/worky-avatar.module';



@NgModule({
  declarations: [WorkyDropdownComponent],
  imports: [
    CommonModule,
    WorkyAvatarModule
  ],
  exports: [WorkyDropdownComponent,],
})
export class WorkyDropdownModule { }
