import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { GroupsRoutingModule } from './groups-routing.module';
import { GroupsListComponent } from './groups-list/groups-list.component';
import { GroupDetailComponent } from './group-detail/group-detail.component';
import { GroupCreateComponent } from './group-create/group-create.component';
import { TranslationsModule } from '@shared/modules/translations/translations.module';

@NgModule({
  declarations: [
    GroupsListComponent,
    GroupDetailComponent,
    GroupCreateComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    GroupsRoutingModule,
    TranslationsModule,
  ],
})
export class GroupsModule {}
