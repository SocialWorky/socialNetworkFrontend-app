import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'worky-text-skeleton',
  template: `
    <div
      role="status"
      aria-label="Loading text"
      class="sk-shimmer sk-text"
      [style.width]="width"
      [style.height]="height">
    </div>
  `,
  styles: [`
    :host { display: block; }
    .sk-text { border-radius: 100px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: []
})
export class TextSkeletonComponent {
  @Input() width: string = '100%';
  @Input() height: string = '10px';
}
