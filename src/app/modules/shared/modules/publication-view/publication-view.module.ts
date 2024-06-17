import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PublicationViewComponent } from './publication-view.component';
import { WorkyAvatarModule } from '../worky-avatar/worky-avatar.module';
import { AddPublicationModule } from '../addPublication/addPublication.module';
import { TranslationsModule } from '../translations/translations.module';
import { WorkyDropdownModule } from '../worky-dropdown/worky-dropdown.module';
import { WorkyRelativeTimePipe } from '@shared/pipes/relative-time.pipe';
import { ImageOrganizerModule } from '../image-organizer/image-organizer.module';
import { WorkyProcessContentPipe } from '@shared/pipes/process-content.pipe';
import { WorkyPreviewHtmlPipe } from '@shared/pipes/preview-html.pipe';
import { ReactionsModule } from '../reactions/reactions.module';

@NgModule({
    declarations: [PublicationViewComponent, WorkyRelativeTimePipe, WorkyProcessContentPipe, WorkyPreviewHtmlPipe],
    exports: [PublicationViewComponent, WorkyRelativeTimePipe, WorkyProcessContentPipe, WorkyPreviewHtmlPipe],
    imports: [
        CommonModule,
        WorkyAvatarModule,
        AddPublicationModule,
        TranslationsModule,
        WorkyDropdownModule,
        ImageOrganizerModule,
        ReactionsModule
    ]
})
export class PublicationViewModule { }
