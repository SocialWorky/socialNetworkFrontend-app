import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { MarkdownModule } from 'ngx-markdown';

import { MessagesComponent } from './messages.component';
import { MessageSideLeftComponent } from './components/message-side-left/message-side-left.component';
import { MessageSideRigthComponent } from './components/message-side-rigth/message-side-rigth.component';
import { UserListItemComponent } from './components/message-side-left/component/user-list-item/user-list-item.component';
import { MessageListComponent } from './components/message-side-left/component/message-list/message-list.component';

import { SharedModule } from '@shared/shared.module';
import { MaterialModule } from '@shared/modules/material/material.module';
import { PipesSharedModule } from '@shared/pipes/pipes-shared.module';
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
import { SyncIndicatorComponent } from '@shared/components/sync-indicator/sync-indicator.component';

const routes: Routes = [
  { path: '', component: MessagesComponent },
  { path: ':userIdMessages', component: MessagesComponent }
];

@NgModule({
  declarations: [
    MessagesComponent,
    MessageSideLeftComponent,
    MessageSideRigthComponent,
    UserListItemComponent,
    MessageListComponent
  ],
      imports: [
      CommonModule,
      IonicModule,
      FormsModule,
      ScrollingModule,
      ReactiveFormsModule,
      RouterModule,
      RouterModule.forChild(routes),
      WorkyDropdownModule,
      TranslationsModule,
      WorkyAvatarModule,
      AddPublicationModule,
      PublicationViewModule,
      WorkyWidgetModule,
      MaterialModule,
      PickerModule,
      MarkdownModule.forRoot(),
      ContactsModule,
      WorkyButtonsModule,
      UserOnlineModule,
      NotificationsPanelModule,
      PipesSharedModule,
      ProcessingMediaModule,
      FormBuilderModule,
      SharedModule,
      SyncIndicatorComponent
    ]
})
export class MessagesModule { } 