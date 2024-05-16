import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeatherComponent } from './worky-weather/worky-weather.component';
import { FormsModule } from '@angular/forms';



@NgModule({
  declarations: [WeatherComponent],
  imports: [
    CommonModule,
    FormsModule
  ],
  exports: [WeatherComponent]
})
export class WorkyWidgetModule { }
