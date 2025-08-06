import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { StatisticsComponent } from './statistics.component';

import { SharedModule } from '@shared/shared.module';
import { MaterialModule } from '@shared/modules/material/material.module';
import { PipesSharedModule } from '@shared/pipes/pipes-shared.module';
import { WorkyAvatarModule } from '@shared/modules/worky-avatar/worky-avatar.module';
import { TranslationsModule } from '@shared/modules/translations/translations.module';

const routes: Routes = [
  { path: '', component: StatisticsComponent }
];

@NgModule({
  declarations: [
    StatisticsComponent
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
    SharedModule
  ]
})
export class StatisticsModule { } 