import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { WidgetContainerComponent } from './widget-container.component';
import { WeatherComponent } from './worky-weather/worky-weather.component';
import { WorkyButtonsModule } from '../buttons/buttons.module';
import { WorkyNewsComponent } from './worky-news/worky-news.component';
import { ThematicImageWidgetComponent } from './thematic-image-widget/thematic-image-widget.component';
import { DynamicWidgetComponent } from './dynamic-widget/dynamic-widget.component';
import { PipesSharedModule } from '@shared/pipes/pipes-shared.module';
import { TranslationsModule } from '../translations/translations.module';


@NgModule({
  declarations: [
    WeatherComponent, 
    WorkyNewsComponent, 
    WidgetContainerComponent,
    ThematicImageWidgetComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    WorkyButtonsModule,
    PipesSharedModule,
    TranslationsModule,
    DynamicWidgetComponent
  ],
  exports: [
    WeatherComponent, 
    WorkyNewsComponent, 
    WidgetContainerComponent,
    ThematicImageWidgetComponent,
    DynamicWidgetComponent
  ]
})
export class WorkyWidgetModule { }
