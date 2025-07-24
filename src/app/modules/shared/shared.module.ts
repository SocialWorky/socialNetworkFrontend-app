import { ScrollingModule } from '@angular/cdk/scrolling';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PullToRefreshService } from './services/pull-to-refresh.service';
import { WorkyImageModule } from './modules/worky-image/worky-image.module';
import { AccessibleLoadingComponent } from './components/accessible-loading/accessible-loading.component';
import { OptimizedImageComponent } from './components/optimized-image/optimized-image.component';

@NgModule({
  imports: [
    CommonModule,
    ScrollingModule,
    WorkyImageModule,
    OptimizedImageComponent
  ],
  declarations: [
    AccessibleLoadingComponent
  ],
  exports: [
    CommonModule,
    ScrollingModule,
    WorkyImageModule,
    AccessibleLoadingComponent,
    OptimizedImageComponent
  ],
  providers: [
    PullToRefreshService
  ]
})

export class SharedModule { }
