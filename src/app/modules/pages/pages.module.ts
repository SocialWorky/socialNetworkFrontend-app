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
import { SideLeftModule } from '@shared/modules/side-left/side-left.module';
import { WorkyDropdownModule } from '@shared/modules/worky-dropdown/worky-dropdown.module';
import { TranslationsModule } from '@shared/modules/translations/translations.module';
import { WorkyAvatarModule } from '@shared/modules/worky-avatar/worky-avatar.module';
import { AddPublicationModule } from '@shared/modules/addPublication/addPublication.module';
import { WorkyWidgetModule } from '@shared/modules/worky-widget/worky-widget.module';
import { PublicationViewModule } from '@shared/modules/publication-view/publication-view.module';
import { SuggetionToFollowModule } from '@shared/modules/suggetion-to-follow/suggetion-to-follow.module';
import { EditImgProfileComponent } from './profiles/components/edit-img/edit-img-profile.component';
import { EditInfoProfileComponent } from './profiles/components/edit-info-profile/edit-info-profile.component';
import { ContactsModule } from '@shared/modules/contacts/contacts.module';
import { WorkyButtonsModule } from '@shared/modules/buttons/buttons.module';


@NgModule({
  declarations: [
    HomeComponent,
    ProfilesComponent,
    LoyautComponent,
    NavbarComponent,
    ContentLeftSideComponent,
    ContentRightSideComponent,
    WorkyMenuComponentComponent,
    EditImgProfileComponent,
    EditInfoProfileComponent,

  ],
  imports: [
    CommonModule,
    FormsModule,
    PagesRoutingModule,
    WorkyDropdownModule,
    TranslationsModule,
    WorkyAvatarModule,
    AddPublicationModule,
    PublicationViewModule,
    WorkyWidgetModule,
    PublicationViewModule,
    SuggetionToFollowModule,
    SideLeftModule,
    ContactsModule,
    WorkyButtonsModule
  ]
})
export class PagesModule { }
