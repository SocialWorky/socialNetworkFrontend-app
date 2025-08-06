import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { RouterModule } from '@angular/router';

import { PagesRoutingModule } from './pages-routing.module';
import { HomeComponent } from './home/home.component';
import { LoyautComponent } from './templates/loyaut/loyaut.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { ContentLeftSideComponent } from './components/content-left-side/content-left-side.component';
import { ContentRightSideComponent } from './components/content-right-side/content-right-side.component';
import { MaterialModule } from '@shared/modules/material/material.module';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { MarkdownModule } from 'ngx-markdown';

import { PipesSharedModule } from '@shared/pipes/pipes-shared.module';
import { WorkyMenuComponentComponent } from './components/navbar/worky-menu-component/worky-menu-component.component';
import { SideBarMenutModule } from '@shared/modules/sidebar-menu/sidebar-menu.module';
import { WorkyDropdownModule } from '@shared/modules/worky-dropdown/worky-dropdown.module';
import { TranslationsModule } from '@shared/modules/translations/translations.module';
import { WorkyAvatarModule } from '@shared/modules/worky-avatar/worky-avatar.module';
import { AddPublicationModule } from '@shared/modules/addPublication/addPublication.module';
import { WorkyWidgetModule } from '@shared/modules/worky-widget/worky-widget.module';
import { PublicationViewModule } from '@shared/modules/publication-view/publication-view.module';
import { ContactsModule } from '@shared/modules/contacts/contacts.module';
import { WorkyButtonsModule } from '@shared/modules/buttons/buttons.module';
import { UserOnlineModule } from '@shared/modules/user-online/user-online.module';
import { NotificationsPanelModule } from '@shared/modules/notifications-panel/notifications-panel.module';
import { ProcessingMediaModule } from '@shared/modules/processing-media/processing-media.module';
import { FormBuilderModule } from '@shared/modules/form-builder/form-builder.module';
import { SharedModule } from '@shared/shared.module';
import { SyncIndicatorComponent } from '@shared/components/sync-indicator/sync-indicator.component';


@NgModule({
  declarations: [
    HomeComponent,
    LoyautComponent,
    NavbarComponent,
    ContentLeftSideComponent,
    ContentRightSideComponent,
    WorkyMenuComponentComponent,
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ScrollingModule,
    ReactiveFormsModule,
    RouterModule,
    PagesRoutingModule,
    WorkyDropdownModule,
    TranslationsModule,
    WorkyAvatarModule,
    AddPublicationModule,
    PublicationViewModule,
    WorkyWidgetModule,
    MaterialModule,
    PickerModule,
    SideBarMenutModule,
    ContactsModule,
    WorkyButtonsModule,
    UserOnlineModule,
    NotificationsPanelModule,
    MarkdownModule.forRoot(),
    PipesSharedModule,
    ProcessingMediaModule,
    FormBuilderModule,
    SharedModule,
    SyncIndicatorComponent,
  ]
})
export class PagesModule { }
