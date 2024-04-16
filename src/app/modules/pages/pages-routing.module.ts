import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { LoyautComponent } from './templates/loyaut/loyaut.component';

const routes: Routes = [
  {
    path: '',
    component: LoyautComponent ,
    children: [
      { path: '', component: HomeComponent, pathMatch: 'full'  },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PagesRoutingModule { }
