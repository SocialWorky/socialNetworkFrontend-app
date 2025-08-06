import { Component, Input, ContentChild, TemplateRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonListComponent } from './skeleton-list.component';
import { SkeletonType } from './skeleton.component';

@Component({
  selector: 'worky-skeleton-wrapper',
  template: `
    <div class="w-full min-h-[200px]">
      <div *ngIf="isLoading" class="flex flex-col items-center gap-5 py-5">
        <worky-skeleton-list
          [type]="skeletonType"
          [count]="skeletonCount"
          [showMedia]="showMedia"
        ></worky-skeleton-list>
        
        <div *ngIf="loadingMessage" class="flex flex-col items-center gap-3 text-gray-600 text-sm">
          <div class="flex items-center justify-center">
            <div class="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
          <span>{{ loadingMessage }}</span>
        </div>
      </div>

      <div *ngIf="!isLoading" class="w-full">
        <ng-container *ngTemplateOutlet="contentTemplate"></ng-container>
      </div>

      <div *ngIf="errorMessage && !isLoading" class="flex flex-col items-center gap-4 py-10 px-5 text-center text-gray-600">
        <div class="text-gray-400">
          <i class="material-icons text-5xl">error_outline</i>
        </div>
        <span class="text-base font-medium">{{ errorMessage }}</span>
        <button *ngIf="retryAction" (click)="retryAction()" class="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors">
          <i class="material-icons text-lg">refresh</i>
          Retry
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, SkeletonListComponent]
})
export class SkeletonWrapperComponent {
  @Input() isLoading: boolean = false;
  @Input() skeletonType: SkeletonType = 'publication';
  @Input() skeletonCount: number = 3;
  @Input() showMedia: boolean = true;
  @Input() loadingMessage?: string;
  @Input() errorMessage?: string;
  @Input() retryAction?: () => void;

  @ContentChild(TemplateRef) contentTemplate!: TemplateRef<any>;
} 