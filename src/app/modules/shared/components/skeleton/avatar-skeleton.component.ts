import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'worky-avatar-skeleton',
  template: `
    <div
      role="status"
      aria-label="Loading avatar"
      class="sk-shimmer sk-avatar"
      [style.width]="size"
      [style.height]="size">
    </div>
  `,
  styles: [`
    :host { display: inline-block; }
    .sk-avatar { border-radius: 50%; overflow: hidden; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: []
})
export class AvatarSkeletonComponent {
  @Input() size: string = '40px';
}
