import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './modules/auth/auth.guard';

const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./modules/auth/auth.module').then( m => m.AuthModule),
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
