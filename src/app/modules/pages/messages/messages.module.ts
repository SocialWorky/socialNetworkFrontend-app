import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ScrollingModule } from '@angular/cdk/scrolling';

import { MessagesComponent } from './messages.component';
import { ConversationItemComponent } from './components/conversation-item/conversation-item.component';
import { ChatWindowComponent } from './components/chat-window/chat-window.component';
import { MessageBubbleComponent } from './components/message-bubble/message-bubble.component';
import { MessageTimePipe } from './pipes/message-time.pipe';

import { SharedModule } from '@shared/shared.module';
import { MaterialModule } from '@shared/modules/material/material.module';
import { WorkyAvatarModule } from '@shared/modules/worky-avatar/worky-avatar.module';
import { TranslationsModule } from '@shared/modules/translations/translations.module';
import { PipesSharedModule } from '@shared/pipes/pipes-shared.module';
import { MarkdownModule } from 'ngx-markdown';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { ProcessingMediaModule } from '@shared/modules/processing-media/processing-media.module';
import { GifSearchModule } from '@shared/modules/gif-search/gif-search.module';
import { ImageUploadModalModule } from '@shared/modules/image-upload-modal/image-upload-modal.module';
import { WorkyDropdownModule } from '@shared/modules/worky-dropdown/worky-dropdown.module';

const routes: Routes = [
  { path: '', component: MessagesComponent },
  { path: ':userIdMessages', component: MessagesComponent }
];

@NgModule({
  declarations: [
    MessagesComponent,
    ConversationItemComponent,
    ChatWindowComponent,
    MessageBubbleComponent,
    MessageTimePipe
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    ScrollingModule,
    RouterModule.forChild(routes),
    SharedModule,
    MaterialModule,
    WorkyAvatarModule,
    TranslationsModule,
    PipesSharedModule,
    MarkdownModule.forRoot(),
    PickerModule,
    ProcessingMediaModule,
    GifSearchModule,
    ImageUploadModalModule,
    WorkyDropdownModule
  ]
})
export class MessagesModule { }

