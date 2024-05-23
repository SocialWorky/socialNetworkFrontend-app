import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@auth/auth.guard';
import { RoleUser } from '@auth/models/roleUser.enum';
import { RoleGuard } from '@admin/guards/role.guard';

const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./modules/auth/auth.module').then( m => m.AuthModule),
  },
  {
    path: 'admin',
    loadChildren: () => import('./modules/admin/admin.module').then( m => m.AdminModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { expectedRole: RoleUser.ADMIN },
  },
  {
    path: '',
    loadChildren: () => import('./modules/pages/pages.module').then( m => m.PagesModule),
    canActivate: [AuthGuard],
  },
  {
    path: '**',
    redirectTo: 'auth',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
