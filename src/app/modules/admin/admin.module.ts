import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TemplatesComponent } from './templates/templates.component';
import { HomeComponent } from './pages/home/home.component';
import { ChangeThemeComponent } from './pages/change-theme/change-theme.component';

import { SidemenuComponent } from './shared/sidemenu/sidemenu.component';
import { StatisticsComponent } from './shared/statistics/statistics.component';
import { LastRegisteredUsersComponent } from './shared/last-registered-users/last-registered-users.component';
import { ChangeThemeColorsComponent } from './shared/change-theme-colors/change-theme-colors.component';
import { CustomCssComponent } from './shared/custom-css/custom-css.component';

import { AdminRoutingModule } from './admin-routing.module';
import { TranslationsModule } from '@shared/modules/translations/translations.module';
import { WorkyAvatarModule } from '@shared/modules/worky-avatar/worky-avatar.module';


@NgModule({
  declarations: [
    TemplatesComponent,
    SidemenuComponent,
    HomeComponent,
    ChangeThemeComponent,
    StatisticsComponent,
    LastRegisteredUsersComponent,
    ChangeThemeColorsComponent,
    CustomCssComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    AdminRoutingModule,
    TranslationsModule,
    WorkyAvatarModule
  ],
  exports: [TemplatesComponent]
})
export class AdminModule { }
