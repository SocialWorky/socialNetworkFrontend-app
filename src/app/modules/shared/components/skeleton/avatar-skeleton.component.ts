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
      
      <div class="w-full h-full bg-gray-200 rounded-full dark:bg-gray-700"></div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule]
})
export class AvatarSkeletonComponent {
  @Input() size: string = '40px';
} 