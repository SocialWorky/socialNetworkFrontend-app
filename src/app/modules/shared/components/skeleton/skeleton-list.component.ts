import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonComponent, SkeletonType } from './skeleton.component';

@Component({
  selector: 'worky-skeleton-list',
  template: `
    <div class="space-y-4 w-full">
      <worky-skeleton
        *ngFor="let item of skeletonArray; trackBy: trackByIndex"
        [type]="type"
        [width]="width"
        [height]="height"
        [showMedia]="showMedia"
      ></worky-skeleton>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, SkeletonComponent]
})
export class SkeletonListComponent {
  @Input() type: SkeletonType = 'publication';
  @Input() count: number = 3;
  @Input() width: string = '100%';
  @Input() height: string = '20px';
  @Input() showMedia: boolean = true;

  get skeletonArray(): number[] {
    return Array.from({ length: this.count }, (_, i) => i);
  }

  trackByIndex(index: number): number {
    return index;
  }
} 