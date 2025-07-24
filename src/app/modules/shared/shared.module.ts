import { ScrollingModule } from '@angular/cdk/scrolling';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PullToRefreshService } from './services/pull-to-refresh.service';
import { WorkyImageModule } from './modules/worky-image/worky-image.module';
import { AccessibleLoadingComponent } from './components/accessible-loading/accessible-loading.component';

@NgModule({
  imports: [
    CommonModule,
    ScrollingModule,
    WorkyImageModule
  ],
  declarations: [
    AccessibleLoadingComponent
  ],
  exports: [
    CommonModule,
    ScrollingModule,
    WorkyImageModule,
    AccessibleLoadingComponent
  ],
  providers: [
    PullToRefreshService
  ]
})

export class SharedModule { }
