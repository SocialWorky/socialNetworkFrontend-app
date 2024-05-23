import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TemplatesComponent } from './templates/templates.component';
import { HomeComponent } from './pages/home/home.component';
import { SidemenuComponent } from './shared/sidemenu/sidemenu.component';
import { StatisticsComponent } from './shared/statistics/statistics.component';
import { UserPendingValidationComponent } from './shared/user-pending-validation/user-pending-validation.component';

import { AdminRoutingModule } from './admin-routing.module';
import { WorkyAvatarModule } from '@shared/worky-avatar/worky-avatar.module';


@NgModule({
  declarations: [
    TemplatesComponent,
    SidemenuComponent,
    HomeComponent,
    StatisticsComponent,
    UserPendingValidationComponent
  ],
  imports: [
    CommonModule,
    AdminRoutingModule,
    WorkyAvatarModule
  ],
  exports: [TemplatesComponent]
})
export class AdminModule { }
