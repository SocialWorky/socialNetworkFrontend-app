import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { PagesRoutingModule } from './pages-routing.module';
import { HomeComponent } from './home/home.component';
import { LoyautComponent } from './templates/loyaut/loyaut.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { ContentLeftSideComponent } from './components/content-left-side/content-left-side.component';
import { ContentRightSideComponent } from './components/content-right-side/content-right-side.component';
import { ProfilesComponent } from './profiles/profiles.component';

import { WorkyMenuComponentComponent } from './components/navbar/worky-menu-component/worky-menu-component.component';
import { WorkyDropdownModule } from '../shared/worky-dropdown/worky-dropdown.module';
import { TranslationsModule } from '../shared/translations/translations.module';
import { WorkyAvatarModule } from '../shared/worky-avatar/worky-avatar.module';
import { AddPublicationModule } from '../shared/addPublication/addPublication.module';
import { WorkyWidgetModule } from 'src/app/modules/shared/worky-widget/worky-widget.module';
import { PublicationViewModule } from '../shared/publication-view/publication-view.module';
import { SuggestedFriendsModule } from '../shared/suggested-friends/suggested-friends.module';

@NgModule({
  declarations: [
    HomeComponent,
    ProfilesComponent,
    LoyautComponent,
    NavbarComponent,
    ContentLeftSideComponent,
    ContentRightSideComponent,
    WorkyMenuComponentComponent

  ],
  imports: [
    CommonModule,
    FormsModule,
    PagesRoutingModule,
    WorkyDropdownModule,
    TranslationsModule,
    WorkyAvatarModule,
    AddPublicationModule,
    WorkyWidgetModule,
    PublicationViewModule,
    SuggestedFriendsModule
  ]
})
export class PagesModule { }
