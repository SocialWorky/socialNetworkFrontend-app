import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { WidgetContainerComponent } from './widget-container.component';
import { WeatherComponent } from './worky-weather/worky-weather.component';
import { WorkyButtonsModule } from '../buttons/buttons.module';
import { WorkyNewsComponent } from './worky-news/worky-news.component';
import { PipesSharedModule } from '@shared/pipes/pipes-shared.module';
import { TranslationsModule } from '../translations/translations.module';


@NgModule({
  declarations: [WeatherComponent, WorkyNewsComponent, WidgetContainerComponent],
  imports: [
    CommonModule,
    FormsModule,
    WorkyButtonsModule,
    PipesSharedModule,
    TranslationsModule
  ],
  exports: [WeatherComponent, WorkyNewsComponent, WidgetContainerComponent]
})
export class WorkyWidgetModule { }
