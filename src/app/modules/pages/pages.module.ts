import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { PagesRoutingModule } from './pages-routing.module';
import { HomeComponent } from './home/home.component';
import { LoyautComponent } from './templates/loyaut/loyaut.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { ContentLeftSideComponent } from './components/content-left-side/content-left-side.component';
import { ContentRightSideComponent } from './components/content-right-side/content-right-side.component';
import { ProfilesComponent } from './profiles/profiles.component';
import { ProfileDetailComponent } from './profiles/components/profile-detail/profile-detail.component';
import { MaterialModule } from '@shared/modules/material/material.module';

import { WorkyMenuComponentComponent } from './components/navbar/worky-menu-component/worky-menu-component.component';
import { SideBarMenutModule } from '@shared/modules/sidebar-menu/sidebar-menu.module';
import { WorkyDropdownModule } from '@shared/modules/worky-dropdown/worky-dropdown.module';
import { TranslationsModule } from '@shared/modules/translations/translations.module';
import { WorkyAvatarModule } from '@shared/modules/worky-avatar/worky-avatar.module';
import { AddPublicationModule } from '@shared/modules/addPublication/addPublication.module';
import { WorkyWidgetModule } from '@shared/modules/worky-widget/worky-widget.module';
import { PublicationViewModule } from '@shared/modules/publication-view/publication-view.module';
import { SuggetionToFollowModule } from '@shared/modules/suggetion-to-follow/suggetion-to-follow.module';
import { EditImgProfileComponent } from './profiles/components/edit-img-profile/edit-img-profile.component';
import { EditInfoProfileDetailComponent } from './profiles/components/edit-info-profile/edit-info-profile.component';
import { ContactsModule } from '@shared/modules/contacts/contacts.module';
import { WorkyButtonsModule } from '@shared/modules/buttons/buttons.module';
import { MessagesComponent } from './messages/messages.component';
import { MessageSideLeftComponent } from './messages/components/message-side-left/message-side-left.component';
import { MessageSideRigthComponent } from './messages/components/message-side-rigth/message-side-rigth.component';
import { UserOnlineModule } from '@shared/modules/user-online/user-online.module';
import { NotificationsPanelModule } from '@shared/modules/notifications-panel/notifications-panel.module';


@NgModule({
  declarations: [
    HomeComponent,
    MessagesComponent,
    MessageSideLeftComponent,
    MessageSideRigthComponent,
    ProfilesComponent,
    LoyautComponent,
    NavbarComponent,
    ContentLeftSideComponent,
    ContentRightSideComponent,
    WorkyMenuComponentComponent,
    EditImgProfileComponent,
    EditInfoProfileDetailComponent,
    ProfileDetailComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PagesRoutingModule,
    WorkyDropdownModule,
    TranslationsModule,
    WorkyAvatarModule,
    AddPublicationModule,
    PublicationViewModule,
    WorkyWidgetModule,
    MaterialModule,
    SuggetionToFollowModule,
    SideBarMenutModule,
    ContactsModule,
    WorkyButtonsModule,
    UserOnlineModule,
    NotificationsPanelModule
  ]
})
export class PagesModule { }
