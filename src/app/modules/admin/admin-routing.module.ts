import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TemplatesComponent } from './templates/templates.component';
import { HomeAdminComponent } from '@admin/pages/home/home.component';
import { CustomCssComponent } from './shared/custom-css/custom-css.component';
import { ManageReactionsComponent } from './shared/manage-reactions/manage-reactions.component';
import { SiteConfigComponent } from './shared/site-config/site-config.component';
import { AdminCustomFieldsComponent } from './shared/admin-custom-fields/admin-custom-fields.component';
import { InvitationsCodeComponent } from './shared/invitations-code/invitations-code.component';
import { LogComponent } from './shared/log/log.component';
import { WidgetManagementComponent } from './shared/widget-management/widget-management.component';
import { WebhooksComponent } from './shared/webhooks/webhooks.component';
import { UserManagementComponent } from './shared/user-management/user-management.component';
import { VersionManagementComponent } from './shared/version-management/version-management.component';
import { translations } from '@translations/translations';


export const routes: Routes = [
  {
    path: '',
    component: TemplatesComponent,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { title: translations['admin.sideMenu.items.goToWall'], path: 'publications', redirectTo: '../' },
      { title: translations['admin.sideMenu.items.metrics'], path: 'home', component: HomeAdminComponent },
      {
        title: translations['admin.sideMenu.items.configurations'],
        path: '',
        children: [
          { title: translations['admin.sideMenu.items.systemConfig'], path: 'site-config', component: SiteConfigComponent },
          { title: translations['admin.sideMenu.items.reactions'], path: 'manage-reactions', component: ManageReactionsComponent },
          { title: translations['admin.sideMenu.items.customFields'], path: 'custom-fields', component: AdminCustomFieldsComponent },
          { title: translations['admin.sideMenu.items.widgetManagement'], path: 'widget-management', component: WidgetManagementComponent },
          { title: translations['admin.sideMenu.items.css'], path: 'custom-css', component: CustomCssComponent },
          { title: translations['admin.sideMenu.items.invitations'], path: 'invitations-code', component: InvitationsCodeComponent },
          { title: translations['admin.sideMenu.items.webhooks'], path: 'webhooks', component: WebhooksComponent },
        
        ],
      },
      { title: translations['admin.sideMenu.items.userManagement'], path: 'user-management', component: UserManagementComponent },
      { title: translations['admin.sideMenu.items.versionManagement'], path: 'version-management', component: VersionManagementComponent },
      { title: translations['admin.sideMenu.items.logs'], path: 'logs', component: LogComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
