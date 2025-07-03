import { ScrollingModule } from '@angular/cdk/scrolling';
import { NgModule } from '@angular/core';
import { PullToRefreshService } from './services/pull-to-refresh.service';

@NgModule({
  imports: [
    ScrollingModule
  ],
  exports: [
    ScrollingModule
  ],
  providers: [
    PullToRefreshService
  ]
})

export class SharedModule { }
