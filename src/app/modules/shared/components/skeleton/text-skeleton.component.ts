import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'worky-text-skeleton',
  template: `
    <div 
      role="status" 
      class="animate-pulse"
      [style.width]="width">
      
      <div class="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700" [style.width]="width"></div>
      
      <span class="sr-only">Loading text...</span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule]
})
export class TextSkeletonComponent {
  @Input() width: string = '100%';
  @Input() height: string = '10px';
} 