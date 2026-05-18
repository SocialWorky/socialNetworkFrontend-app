import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { LoyautComponent } from './templates/loyaut/loyaut.component';

const routes: Routes = [
  {
    path: '',
    component: LoyautComponent,
    children: [
      { path: '', component: HomeComponent, pathMatch: 'full'},
      { path: 'publication/:_idPublication', component: HomeComponent },
      { 
        path: 'profile', 
        loadChildren: () => import('./profiles/profiles.module').then(m => m.ProfilesModule)
      },
      { 
        path: 'profile/:profileId', 
        loadChildren: () => import('./profiles/profiles.module').then(m => m.ProfilesModule)
      },
      { 
        path: 'messages', 
        loadChildren: () => import('./messages/messages.module').then(m => m.MessagesModule)
      },
      {
        path: 'messages/:userIdMessages',
        loadChildren: () => import('./messages/messages.module').then(m => m.MessagesModule)
      },
      {
        path: 'subscribe',
        loadChildren: () => import('./subscribe/subscribe.module').then(m => m.SubscribeModule)
      },
      {
        path: 'groups',
        loadChildren: () => import('./groups/groups.module').then(m => m.GroupsModule)
      },
      {
        path: 'events',
        loadChildren: () => import('./events/events.module').then(m => m.EventsModule)
      },

      { path: '**', redirectTo: '', pathMatch: 'full' }
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PagesRoutingModule { }
