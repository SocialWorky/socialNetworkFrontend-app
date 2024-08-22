import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { WeatherComponent } from './worky-weather/worky-weather.component';
import { WorkyButtonsModule } from '../buttons/buttons.module';
import { WorkyNewsComponent } from './worky-news/worky-news.component';
import { PipesSharedModule } from '@shared/pipes/pipes-shared.module';


@NgModule({
  declarations: [WeatherComponent, WorkyNewsComponent],
  imports: [
    CommonModule,
    FormsModule,
    WorkyButtonsModule,
    PipesSharedModule
  ],
  exports: [WeatherComponent, WorkyNewsComponent]
})
export class WorkyWidgetModule { }
