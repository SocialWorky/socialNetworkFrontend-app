import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'worky-button-skeleton',
  template: `
    <div 
      role="status" 
      class="animate-pulse"
      [style.width]="width"
      [style.height]="height">
      
      <div class="w-full h-full bg-gray-200 rounded-lg dark:bg-gray-700"></div>
      
      <span class="sr-only">Loading button...</span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule]
})
export class ButtonSkeletonComponent {
  @Input() width: string = '100px';
  @Input() height: string = '36px';
} 