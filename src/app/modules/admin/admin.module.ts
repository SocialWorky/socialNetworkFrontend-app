import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { NgxJsonViewerModule } from 'ngx-json-viewer';

import { TemplatesComponent } from './templates/templates.component';
import { HomeAdminComponent } from './pages/home/home.component';

import { SideMenuComponent } from './shared/side-menu/side-menu.component';
import { StatisticsComponent } from './shared/statistics/statistics.component';
import { LastRegisteredUsersComponent } from './shared/last-registered-users/last-registered-users.component';
import { CustomCssComponent } from './shared/custom-css/custom-css.component';
import { ManageReactionsComponent } from './shared/manage-reactions/manage-reactions.component';
import { SiteConfigComponent } from './shared/site-config/site-config.component';
import { AdminCustomFieldsComponent } from './shared/admin-custom-fields/admin-custom-fields.component';
import { InvitationsCodeComponent } from './shared/invitations-code/invitations-code.component';
import { LogComponent } from './shared/log/log.component';
import { WebhooksComponent } from './shared/webhooks/webhooks.component';
import { WidgetManagementComponent } from './shared/widget-management/widget-management.component';

import { VersionManagementComponent } from './shared/version-management/version-management.component';

// Shared Components Module
import { AdminSharedComponentsModule } from './shared/components/admin-shared-components.module';

import { AdminRoutingModule } from './admin-routing.module';
import { TranslationsModule } from '@shared/modules/translations/translations.module';
import { WorkyAvatarModule } from '@shared/modules/worky-avatar/worky-avatar.module';
import { FormBuilderModule } from '@shared/modules/form-builder/form-builder.module';
import { PipesSharedModule } from '@shared/pipes/pipes-shared.module';
import { SharedModule } from '@shared/shared.module';
import { MaterialModule } from '@shared/modules/material/material.module';


@NgModule({
  declarations: [
    TemplatesComponent,
    SideMenuComponent,
    HomeAdminComponent,
    StatisticsComponent,
    LastRegisteredUsersComponent,
    CustomCssComponent,
    ManageReactionsComponent,
    SiteConfigComponent,
    AdminCustomFieldsComponent,
    InvitationsCodeComponent,
    LogComponent,
    WebhooksComponent,
    VersionManagementComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    MonacoEditorModule.forRoot(),
    NgxJsonViewerModule,
    AdminRoutingModule,
    TranslationsModule,
    WorkyAvatarModule,
    FormBuilderModule,
    PipesSharedModule,
    SharedModule,
    MaterialModule,
    AdminSharedComponentsModule
  ],
  exports: [TemplatesComponent],
})
export class AdminModule { }
