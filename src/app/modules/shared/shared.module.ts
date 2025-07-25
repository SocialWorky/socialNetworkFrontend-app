import { ScrollingModule } from '@angular/cdk/scrolling';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PullToRefreshService } from './services/pull-to-refresh.service';
import { IOSOptimizationsService } from './services/ios-optimizations.service';
import { WorkyImageModule } from './modules/worky-image/worky-image.module';
import { AccessibleLoadingComponent } from './components/accessible-loading/accessible-loading.component';
import { OptimizedImageComponent } from './components/optimized-image/optimized-image.component';
import { OptimizedVideoComponent } from './components/optimized-video/optimized-video.component';
import { SkeletonComponent } from './components/skeleton/skeleton.component';
import { SkeletonListComponent } from './components/skeleton/skeleton-list.component';
import { SkeletonWrapperComponent } from './components/skeleton/skeleton-wrapper.component';
import { ImageSkeletonComponent } from './components/skeleton/image-skeleton.component';
import { TextSkeletonComponent } from './components/skeleton/text-skeleton.component';
import { AvatarSkeletonComponent } from './components/skeleton/avatar-skeleton.component';
import { ButtonSkeletonComponent } from './components/skeleton/button-skeleton.component';

@NgModule({
  imports: [
    CommonModule,
    ScrollingModule,
    WorkyImageModule,
    OptimizedImageComponent,
    OptimizedVideoComponent,
    SkeletonComponent,
    SkeletonListComponent,
    SkeletonWrapperComponent,
    ImageSkeletonComponent,
    TextSkeletonComponent,
    AvatarSkeletonComponent,
    ButtonSkeletonComponent
  ],
  declarations: [
    AccessibleLoadingComponent
  ],
  exports: [
    CommonModule,
    ScrollingModule,
    WorkyImageModule,
    AccessibleLoadingComponent,
    OptimizedImageComponent,
    OptimizedVideoComponent,
    SkeletonComponent,
    SkeletonListComponent,
    SkeletonWrapperComponent,
    ImageSkeletonComponent,
    TextSkeletonComponent,
    AvatarSkeletonComponent,
    ButtonSkeletonComponent
  ],
  providers: [
    PullToRefreshService,
    IOSOptimizationsService
  ]
})

export class SharedModule { }
