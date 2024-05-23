import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { WeatherComponent } from './worky-weather/worky-weather.component';
import { WorkyButtonsModule } from '../buttons/buttons.module';


@NgModule({
  declarations: [WeatherComponent],
  imports: [
    CommonModule,
    FormsModule,
    WorkyButtonsModule
  ],
  exports: [WeatherComponent]
})
export class WorkyWidgetModule { }
