import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SkeletonType = 'text' | 'avatar' | 'image' | 'button' | 'card' | 'list-item' | 'publication' | 'profile' | 'comment' | 'widget';

@Component({
  selector: 'worky-skeleton',
  template: `
    <div 
      role="status" 
      class="animate-pulse"
      [class]="getContainerClasses()">
      
      <div *ngIf="type === 'text'" class="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700" [style.width]="width"></div>

      <div *ngIf="type === 'avatar'" class="w-10 h-10 bg-gray-200 rounded-full dark:bg-gray-700"></div>

      <div *ngIf="type === 'image'" class="w-full h-48 bg-gray-200 rounded-lg dark:bg-gray-700 flex items-center justify-center">
        <svg class="w-10 h-10 text-gray-300 dark:text-gray-600" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 18">
          <path d="M18 0H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm-5.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4.376 10.481A1 1 0 0 1 16 15H4a1 1 0 0 1-.895-1.447l3.5-7A1 1 0 0 1 7.468 6a.965.965 0 0 1 .9.5l2.775 4.757 1.546-1.887a1 1 0 0 1 1.618.1l2.541 4a1 1 0 0 1 .028 1.011Z"/>
        </svg>
      </div>

      <div *ngIf="type === 'button'" class="h-9 bg-gray-200 rounded-lg dark:bg-gray-700" [style.width]="width"></div>

      <div *ngIf="type === 'publication'" class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 space-y-4">
        <div class="flex items-center space-x-4">
          <div class="w-10 h-10 bg-gray-200 rounded-full dark:bg-gray-700"></div>
          <div class="flex-1 space-y-2">
            <div class="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-24"></div>
            <div class="h-2 bg-gray-200 rounded-full dark:bg-gray-700 w-16"></div>
          </div>
        </div>
        
        <div class="space-y-2">
          <div class="h-2 bg-gray-200 rounded-full dark:bg-gray-700"></div>
          <div class="h-2 bg-gray-200 rounded-full dark:bg-gray-700 max-w-[360px]"></div>
          <div class="h-2 bg-gray-200 rounded-full dark:bg-gray-700 max-w-[330px]"></div>
        </div>
        
        <div *ngIf="showMedia" class="w-full h-48 bg-gray-200 rounded-lg dark:bg-gray-700 flex items-center justify-center">
          <svg class="w-10 h-10 text-gray-300 dark:text-gray-600" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 18">
            <path d="M18 0H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm-5.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4.376 10.481A1 1 0 0 1 16 15H4a1 1 0 0 1-.895-1.447l3.5-7A1 1 0 0 1 7.468 6a.965.965 0 0 1 .9.5l2.775 4.757 1.546-1.887a1 1 0 0 1 1.618.1l2.541 4a1 1 0 0 1 .028 1.011Z"/>
          </svg>
        </div>
        
        <div class="flex justify-between">
          <div class="h-8 bg-gray-200 rounded-full dark:bg-gray-700 w-16"></div>
          <div class="h-8 bg-gray-200 rounded-full dark:bg-gray-700 w-16"></div>
          <div class="h-8 bg-gray-200 rounded-full dark:bg-gray-700 w-16"></div>
        </div>
      </div>

      <div *ngIf="type === 'profile'" class="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div class="w-full h-32 bg-gray-200 rounded-t-lg dark:bg-gray-700"></div>
        
        <div class="relative px-4 pb-4">
          <div class="flex items-end space-x-4 -mt-8 mb-5">
            <div class="w-20 h-20 bg-gray-200 rounded-full border-4 border-white dark:border-gray-800 dark:bg-gray-700"></div>
            <div class="flex-1 space-y-2">
              <div class="h-5 bg-gray-200 rounded dark:bg-gray-700 w-32"></div>
              <div class="h-3 bg-gray-200 rounded dark:bg-gray-700 w-full"></div>
            </div>
          </div>
          
          <div class="flex justify-around pt-4 border-t border-gray-100 dark:border-gray-700">
            <div class="text-center space-y-1">
              <div class="h-4 bg-gray-200 rounded dark:bg-gray-700 w-8 mx-auto"></div>
              <div class="h-3 bg-gray-200 rounded dark:bg-gray-700 w-12 mx-auto"></div>
            </div>
            <div class="text-center space-y-1">
              <div class="h-4 bg-gray-200 rounded dark:bg-gray-700 w-8 mx-auto"></div>
              <div class="h-3 bg-gray-200 rounded dark:bg-gray-700 w-12 mx-auto"></div>
            </div>
            <div class="text-center space-y-1">
              <div class="h-4 bg-gray-200 rounded dark:bg-gray-700 w-8 mx-auto"></div>
              <div class="h-3 bg-gray-200 rounded dark:bg-gray-700 w-12 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="type === 'comment'" class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 space-y-3">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 bg-gray-200 rounded-full dark:bg-gray-700"></div>
          <div class="flex-1 space-y-1">
            <div class="h-3 bg-gray-200 rounded dark:bg-gray-700 w-20"></div>
            <div class="h-2 bg-gray-200 rounded dark:bg-gray-700 w-12"></div>
          </div>
        </div>
        
        <div class="space-y-1">
          <div class="h-3 bg-gray-200 rounded dark:bg-gray-700"></div>
          <div class="h-3 bg-gray-200 rounded dark:bg-gray-700 max-w-[80%]"></div>
        </div>
      </div>

      <div *ngIf="type === 'list-item'" class="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div class="w-10 h-10 bg-gray-200 rounded-full dark:bg-gray-700"></div>
        <div class="flex-1 space-y-1">
          <div class="h-4 bg-gray-200 rounded dark:bg-gray-700 w-24"></div>
          <div class="h-3 bg-gray-200 rounded dark:bg-gray-700 w-16"></div>
        </div>
      </div>

      <div *ngIf="type === 'card'" class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 space-y-4">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-gray-200 rounded-full dark:bg-gray-700"></div>
          <div class="flex-1 space-y-1">
            <div class="h-4 bg-gray-200 rounded dark:bg-gray-700 w-24"></div>
            <div class="h-3 bg-gray-200 rounded dark:bg-gray-700 w-16"></div>
          </div>
        </div>
        
        <div class="space-y-2">
          <div class="h-4 bg-gray-200 rounded dark:bg-gray-700"></div>
          <div class="h-3 bg-gray-200 rounded dark:bg-gray-700 max-w-[75%]"></div>
          <div class="h-3 bg-gray-200 rounded dark:bg-gray-700 max-w-[50%]"></div>
        </div>
        
        <div class="flex space-x-3">
          <div class="h-8 bg-gray-200 rounded-full dark:bg-gray-700 w-20"></div>
          <div class="h-8 bg-gray-200 rounded-full dark:bg-gray-700 w-20"></div>
        </div>
      </div>

      <div *ngIf="type === 'widget'" class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 space-y-4">
        <div class="h-6 bg-gray-200 rounded dark:bg-gray-700 w-32"></div>
        
        <div class="space-y-2">
          <div class="h-4 bg-gray-200 rounded dark:bg-gray-700"></div>
          <div class="h-4 bg-gray-200 rounded dark:bg-gray-700 max-w-[80%]"></div>
          <div class="h-4 bg-gray-200 rounded dark:bg-gray-700 max-w-[60%]"></div>
        </div>
        
        <div class="h-8 bg-gray-200 rounded-lg dark:bg-gray-700 w-24"></div>
      </div>

      <span class="sr-only">Loading...</span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule]
})
export class SkeletonComponent {
  @Input() type: SkeletonType = 'text';
  @Input() width: string = '100%';
  @Input() height: string = '20px';
  @Input() showMedia: boolean = true;

  getContainerClasses(): string {
    const baseClasses = 'animate-pulse';
    
    if (this.type === 'text') {
      return `${baseClasses} max-w-sm`;
    }
    
    if (this.type === 'avatar') {
      return `${baseClasses}`;
    }
    
    if (this.type === 'image') {
      return `${baseClasses} w-full`;
    }
    
    if (this.type === 'button') {
      return `${baseClasses}`;
    }
    
    return baseClasses;
  }
} 