import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ProfilesComponent } from './profiles/profiles.component';
import { LoyautComponent } from './templates/loyaut/loyaut.component';
import { MessagesComponent } from './messages/messages.component';

const routes: Routes = [
  {
    path: '',
    component: LoyautComponent ,
    children: [
      { path: '', component: HomeComponent, pathMatch: 'full'},
      { path: 'publication/:_idPublication', component: HomeComponent},
      { path: 'profile', component: ProfilesComponent},
      { path: 'profile/:profileId', component: ProfilesComponent},
      { path: 'messages', component: MessagesComponent},
      { path: 'messages/:userIdMessages', component: MessagesComponent},
      { path: '**', redirectTo: '', pathMatch: 'full'}
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PagesRoutingModule { }
