import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { NearbyUsersComponent } from './nearby-users.component';
import { WorkyAvatarModule } from '../worky-avatar/worky-avatar.module';
import { TranslationsModule } from '../translations/translations.module';

@NgModule({
  declarations: [NearbyUsersComponent],
  imports: [
    CommonModule,
    RouterModule,
    WorkyAvatarModule,
    TranslationsModule,
  ],
  exports: [NearbyUsersComponent],
})
export class NearbyUsersModule {}
