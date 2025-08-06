import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { UserManagementComponent } from './user-management.component';
import { UserStatsComponent } from './components/user-stats/user-stats.component';
import { UserFiltersComponent } from './components/user-filters/user-filters.component';
import { UserTableComponent } from './components/user-table/user-table.component';
import { UserPaginationComponent } from './components/user-pagination/user-pagination.component';
import { UserDetailsModalComponent } from './components/user-details-modal/user-details-modal.component';
import { UserEditModalComponent } from './components/user-edit-modal/user-edit-modal.component';

import { SharedModule } from '@shared/shared.module';
import { MaterialModule } from '@shared/modules/material/material.module';
import { PipesSharedModule } from '@shared/pipes/pipes-shared.module';
import { WorkyAvatarModule } from '@shared/modules/worky-avatar/worky-avatar.module';
import { TranslationsModule } from '@shared/modules/translations/translations.module';
import { FormBuilderModule } from '@shared/modules/form-builder/form-builder.module';
import { AdminSharedComponentsModule } from '../components/admin-shared-components.module';

const routes: Routes = [
  { path: '', component: UserManagementComponent }
];

@NgModule({
  declarations: [
    UserManagementComponent,
    UserStatsComponent,
    UserFiltersComponent,
    UserTableComponent,
    UserPaginationComponent,
    UserDetailsModalComponent,
    UserEditModalComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    RouterModule.forChild(routes),
    WorkyAvatarModule,
    TranslationsModule,
    MaterialModule,
    PipesSharedModule,
    FormBuilderModule,
    SharedModule,
    AdminSharedComponentsModule
  ]
})
export class UserManagementModule { } 