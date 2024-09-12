import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TemplatesComponent } from './templates/templates.component';
import { HomeAdminComponent } from '@admin/pages/home/home.component';
import { ChangeThemeComponent } from './pages/change-theme/change-theme.component';
import { CustomCssComponent } from './shared/custom-css/custom-css.component';
import { ManageReactionsComponent } from './shared/manage-reactions/manage-reactions.component';
import { SiteConfigComponent } from './shared/site-config/site-config.component';

export const routes: Routes = [
  {
    path: '',
    component: TemplatesComponent,
    children: [
      { title: 'Estadisticas', path: 'home', component: HomeAdminComponent },
      { title: 'Ir al Muro', path: 'publications', redirectTo: '../' },
      { title: 'Administrar Reacciones', path: 'manage-reactions', component: ManageReactionsComponent},
      { title: 'Configuración del Sitio', path: 'site-config', component: SiteConfigComponent},
      // { title: 'Cambio de colores', path: 'change-theme', component: ChangeThemeComponent},
      { title: 'Estilos Personalizados', path: 'custom-css', component: CustomCssComponent},
      // { title: 'Usuarios', path: 'users', component: UsersComponent },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
