import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';

import { TemplatesComponent } from './templates/templates.component';
import { HomeAdminComponent } from './pages/home/home.component';
import { ChangeThemeComponent } from './pages/change-theme/change-theme.component';

import { SidemenuComponent } from './shared/sidemenu/sidemenu.component';
import { StatisticsComponent } from './shared/statistics/statistics.component';
import { LastRegisteredUsersComponent } from './shared/last-registered-users/last-registered-users.component';
import { ChangeThemeColorsComponent } from './shared/change-theme-colors/change-theme-colors.component';
import { CustomCssComponent } from './shared/custom-css/custom-css.component';
import { ManageReactionsComponent } from './shared/manage-reactions/manage-reactions.component';
import { SiteConfigComponent } from './shared/site-config/site-config.component';
import { AdminCustomFieldsComponent } from './shared/admin-custom-fields/admin-custom-fields.component';
import { InvitationsCodeComponent } from './shared/invitations-code/invitations-code.component';

import { AdminRoutingModule } from './admin-routing.module';
import { TranslationsModule } from '@shared/modules/translations/translations.module';
import { WorkyAvatarModule } from '@shared/modules/worky-avatar/worky-avatar.module';
import { FormBuilderModule } from '@shared/modules/form-builder/form-builder.module';


@NgModule({
  declarations: [
    TemplatesComponent,
    SidemenuComponent,
    HomeAdminComponent,
    ChangeThemeComponent,
    StatisticsComponent,
    LastRegisteredUsersComponent,
    ChangeThemeColorsComponent,
    CustomCssComponent,
    ManageReactionsComponent,
    SiteConfigComponent,
    AdminCustomFieldsComponent,
    InvitationsCodeComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MonacoEditorModule.forRoot(),
    AdminRoutingModule,
    TranslationsModule,
    WorkyAvatarModule,
    FormBuilderModule
  ],
  exports: [TemplatesComponent]
})
export class AdminModule { }
