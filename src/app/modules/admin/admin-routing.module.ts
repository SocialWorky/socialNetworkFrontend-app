import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TemplatesComponent } from './templates/templates.component';
import { HomeComponent } from '@admin/pages/home/home.component';
import { UsersComponent } from '@admin/pages/users/users.component';

export const routes: Routes = [
  {
    path: '',
    component: TemplatesComponent,
    children: [
      { title: 'Inicio', path: 'home', component: HomeComponent },
      { title: 'Usuarios', path: 'users', component: UsersComponent },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
