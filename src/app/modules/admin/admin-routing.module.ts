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


export const routes: Routes = [
  {
    path: '',
    component: TemplatesComponent,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { title: 'Ir al Muro', path: 'publications', redirectTo: '../' },
      { title: 'Métricas', path: 'home', component: HomeAdminComponent },
      {
        title: 'Configuraciones',
        path: '',
        children: [
          { title: 'Del Sistema', path: 'site-config', component: SiteConfigComponent },
          { title: 'Reacciones', path: 'manage-reactions', component: ManageReactionsComponent },
          { title: 'Campos Personalizados', path: 'custom-fields', component: AdminCustomFieldsComponent },
          { title: 'Widgets Gestión', path: 'widget-management', component: WidgetManagementComponent },
          { title: 'CSS', path: 'custom-css', component: CustomCssComponent },
          { title: 'Invitaciones', path: 'invitations-code', component: InvitationsCodeComponent },
          { title: 'Webhooks', path: 'webhooks', component: WebhooksComponent },
        
        ],
      },
      { title: 'Gestión de Usuarios', path: 'user-management', component: UserManagementComponent },
      { title: 'Logs', path: 'logs', component: LogComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
