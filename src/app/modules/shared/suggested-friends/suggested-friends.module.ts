import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SuggestedFriendsComponent } from './suggested-friends.component';



@NgModule({
  declarations: [SuggestedFriendsComponent],
  imports: [
    CommonModule
  ],
  exports: [SuggestedFriendsComponent]
})
export class SuggestedFriendsModule { }
