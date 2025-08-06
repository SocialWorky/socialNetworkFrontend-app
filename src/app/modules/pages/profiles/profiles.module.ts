import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { MarkdownModule } from 'ngx-markdown';

import { ProfilesComponent } from './profiles.component';
import { ProfileDetailComponent } from './components/profile-detail/profile-detail.component';
import { EditImgProfileComponent } from './components/edit-img-profile/edit-img-profile.component';
import { EditInfoProfileDetailComponent } from './components/edit-info-profile/edit-info-profile.component';

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
  { path: '', component: ProfilesComponent },
  { path: ':profileId', component: ProfilesComponent }
];

@NgModule({
  declarations: [
    ProfilesComponent,
    ProfileDetailComponent,
    EditImgProfileComponent,
    EditInfoProfileDetailComponent
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
    ContactsModule,
    WorkyButtonsModule,
    UserOnlineModule,
    NotificationsPanelModule,
    MarkdownModule.forRoot(),
    PipesSharedModule,
    ProcessingMediaModule,
    FormBuilderModule,
    SharedModule,
    SyncIndicatorComponent
  ]
})
export class ProfilesModule { } 