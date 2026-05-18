import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { EventsRoutingModule } from './events-routing.module';
import { EventsListComponent } from './events-list/events-list.component';
import { EventDetailComponent } from './event-detail/event-detail.component';
import { EventCreateComponent } from './event-create/event-create.component';
import { TranslationsModule } from '@shared/modules/translations/translations.module';

@NgModule({
  declarations: [
    EventsListComponent,
    EventDetailComponent,
    EventCreateComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    EventsRoutingModule,
    TranslationsModule,
  ],
})
export class EventsModule {}
