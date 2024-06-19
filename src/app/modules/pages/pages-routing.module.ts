import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ProfilesComponent } from './profiles/profiles.component';
import { LoyautComponent } from './templates/loyaut/loyaut.component';

const routes: Routes = [
  {
    path: '',
    component: LoyautComponent ,
    children: [
      { path: '', component: HomeComponent, pathMatch: 'full'  },
      { path: 'publication/:_idPublication', component: HomeComponent, pathMatch: 'full'},
      { path: 'profile', component: ProfilesComponent, pathMatch: 'full' },
      { path: 'profile/:profileId', component: ProfilesComponent, pathMatch: 'full' },
      { path: '**', redirectTo: '', pathMatch: 'full' }
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PagesRoutingModule { }
