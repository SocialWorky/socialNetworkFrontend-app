import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { WeatherComponent } from './worky-weather/worky-weather.component';
import { WorkyButtonsModule } from '../buttons/buttons.module';
import { WorkyNewsComponent } from './worky-news/worky-news.component';
import { WorkyDateFormatPipe } from '@shared/pipes/dateFormat.pipe';


@NgModule({
  declarations: [WeatherComponent, WorkyNewsComponent, WorkyDateFormatPipe],
  imports: [
    CommonModule,
    FormsModule,
    WorkyButtonsModule
  ],
  exports: [WeatherComponent, WorkyNewsComponent, WorkyDateFormatPipe]
})
export class WorkyWidgetModule { }
