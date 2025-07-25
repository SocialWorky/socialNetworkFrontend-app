import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'worky-avatar-skeleton',
  template: `
    <div 
      role="status" 
      class="animate-pulse"
      [style.width]="size"
      [style.height]="size">
      
      <div class="w-full h-full bg-gray-200 rounded-full dark:bg-gray-700 flex items-center justify-center">
        <svg class="w-1/2 h-1/2 text-gray-300 dark:text-gray-600" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 18">
          <path d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"/>
        </svg>
      </div>
      
      <span class="sr-only">Loading avatar...</span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule]
})
export class AvatarSkeletonComponent {
  @Input() size: string = '40px';
} 