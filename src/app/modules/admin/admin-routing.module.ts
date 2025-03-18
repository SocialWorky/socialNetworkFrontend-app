import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TemplatesComponent } from './templates/templates.component';
import { HomeAdminComponent } from '@admin/pages/home/home.component';
import { ChangeThemeComponent } from './pages/change-theme/change-theme.component';
import { CustomCssComponent } from './shared/custom-css/custom-css.component';
import { ManageReactionsComponent } from './shared/manage-reactions/manage-reactions.component';
import { SiteConfigComponent } from './shared/site-config/site-config.component';
import { AdminCustomFieldsComponent } from './shared/admin-custom-fields/admin-custom-fields.component';
import { InvitationsCodeComponent } from './shared/invitations-code/invitations-code.component';

export const routes: Routes = [
  {
    path: '',
    component: TemplatesComponent,
    children: [
      { title: 'Ir al Muro', path: 'publications', redirectTo: '../' },
      { title: 'Estadísticas', path: 'home', component: HomeAdminComponent },
      {
        title: 'Configuraciones',
        path: '',
        children: [
          { title: 'Del Sistema', path: 'site-config', component: SiteConfigComponent },
          { title: 'Reacciones', path: 'manage-reactions', component: ManageReactionsComponent },
          { title: 'Campos Personalizados', path: 'custom-fields', component: AdminCustomFieldsComponent },
          { title: 'CSS', path: 'custom-css', component: CustomCssComponent },
          { title: 'Invitaciones', path: 'invitations-code', component: InvitationsCodeComponent },
        ],
      },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
