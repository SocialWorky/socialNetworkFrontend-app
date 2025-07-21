import { ScrollingModule } from '@angular/cdk/scrolling';
import { NgModule } from '@angular/core';
import { PullToRefreshService } from './services/pull-to-refresh.service';
import { WorkyImageModule } from './modules/worky-image/worky-image.module';

@NgModule({
  imports: [
    ScrollingModule,
    WorkyImageModule
  ],
  exports: [
    ScrollingModule,
    WorkyImageModule
  ],
  providers: [
    PullToRefreshService
  ]
})

export class SharedModule { }
